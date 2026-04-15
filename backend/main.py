import csv
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import RandomForestRegressor

DATA_FILE = "data.csv"

app = FastAPI(title="Restaurant Forecaster")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None


def train_model():
    global model
    df = pd.read_csv(DATA_FILE)
    X = df[["hour", "is_weekend", "is_rain"]]
    y = df["customers"]
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)


train_model()


class PredictRequest(BaseModel):
    hour: int
    is_weekend: int   # 1 = weekend, 0 = weekday
    is_rain: int      # 1 = rain, 0 = clear


class FeedbackRequest(BaseModel):
    hour: int
    is_weekend: int
    is_rain: int
    actual_customers: int


@app.get("/")
def root():
    return {"message": "Restaurant Forecaster API"}


@app.post("/predict")
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not trained")

    features = pd.DataFrame([[req.hour, req.is_weekend, req.is_rain]], columns=["hour", "is_weekend", "is_rain"])
    customers = int(round(model.predict(features)[0]))
    customers = max(0, customers)

    waiters = max(1, round(customers / 20))
    chefs = max(1, round(customers / 40))
    dishes = round(customers * 1.5)

    return {
        "customers": customers,
        "staff": {
            "waiters": waiters,
            "chefs": chefs,
        },
        "ingredients": {
            "dishes": dishes,
            "chicken_kg": round(dishes * 0.3, 1),
            "rice_kg": round(dishes * 0.15, 1),
        },
    }


@app.post("/feedback")
def feedback(req: FeedbackRequest):
    with open(DATA_FILE, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([req.hour, req.is_weekend, req.is_rain, req.actual_customers])

    train_model()
    return {"message": "Feedback saved and model retrained"}
