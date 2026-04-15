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

# Shelf life (days) and supplier lead time (days) per ingredient
INGREDIENT_META = {
    "chicken": {"shelf_life_days": 2, "lead_time_days": 1},
    "rice":    {"shelf_life_days": 30, "lead_time_days": 1},
}


def train_model():
    # This is because to modify global model variable otherwise it treats as local
    global model

    # Read file from csv
    df = pd.read_csv(DATA_FILE)

    # Remove outliers
    df = df[(df["customers"] >= 0) & (df["customers"] <= 500)]

    # Input to help in model prediction
    X = df[["hour", "is_weekend", "is_rain"]]

    # Output to help in model prediction
    y = df["customers"]

    # Random Forest Regressor to help in model prediction (100 trees, fixed seed)
    model = RandomForestRegressor(n_estimators=100, random_state=42)

    # Train the model
    model.fit(X, y)


# On each time server start it train the model
train_model()


class PredictRequest(BaseModel):
    hour: int
    is_weekend: int                     # 1 = weekend, 0 = weekday
    is_rain: int                        # 1 = rain, 0 = clear
    current_chicken_stock: float = None
    current_rice_stock: float = None
    chicken_stock_age_days: int = 0     # days since chicken stock was received
    rice_stock_age_days: int = 0        # days since rice stock was received


class PredictDayRequest(BaseModel):
    is_weekend: int
    is_rain: int
    current_chicken_stock: float = None
    current_rice_stock: float = None
    chicken_stock_age_days: int = 0
    rice_stock_age_days: int = 0


class FeedbackRequest(BaseModel):
    hour: int
    is_weekend: int
    is_rain: int
    actual_customers: int


def _usable_stock(current: float, age_days: int, shelf_life: int, lead_time: int) -> float:
    """Return usable stock accounting for shelf life and supplier lead time."""
    if current is None:
        return 0.0
    remaining_shelf_life = shelf_life - age_days
    # Stock is only usable if it won't expire before the new order arrives
    return current if remaining_shelf_life >= lead_time else 0.0


def _predict_hour(
    hour: int, is_weekend: int, is_rain: int,
    current_chicken_stock: float = None,
    current_rice_stock: float = None,
    chicken_stock_age_days: int = 0,
    rice_stock_age_days: int = 0,
) -> dict:
    features = pd.DataFrame(
        [[hour, is_weekend, is_rain]],
        columns=["hour", "is_weekend", "is_rain"]
    )
    customers = int(round(model.predict(features)[0]))
    customers = max(0, customers)

    # Staff by role
    waiters = max(1, round(customers / 20))
    chefs   = max(1, round(customers / 40))

    # Staff by station
    grill = max(1, round(customers / 35))
    bar   = max(1, round(customers / 45))
    host  = 1 if customers <= 60 else 2

    # Ingredient quantities needed
    dishes     = round(customers * 1.5)
    chicken_kg = round(dishes * 0.3, 1)
    rice_kg    = round(dishes * 0.15, 1)

    chicken_meta = INGREDIENT_META["chicken"]
    rice_meta    = INGREDIENT_META["rice"]

    ingredients = {
        "dishes":                    dishes,
        "chicken_kg":                chicken_kg,
        "rice_kg":                   rice_kg,
        "chicken_shelf_life_days":   chicken_meta["shelf_life_days"],
        "chicken_lead_time_days":    chicken_meta["lead_time_days"],
        "rice_shelf_life_days":      rice_meta["shelf_life_days"],
        "rice_lead_time_days":       rice_meta["lead_time_days"],
    }

    if current_chicken_stock is not None:
        usable = _usable_stock(
            current_chicken_stock, chicken_stock_age_days,
            chicken_meta["shelf_life_days"], chicken_meta["lead_time_days"]
        )
        ingredients["chicken_order_required"] = max(0, round(chicken_kg - usable, 1))

    if current_rice_stock is not None:
        usable = _usable_stock(
            current_rice_stock, rice_stock_age_days,
            rice_meta["shelf_life_days"], rice_meta["lead_time_days"]
        )
        ingredients["rice_order_required"] = max(0, round(rice_kg - usable, 1))

    return {
        "customers": customers,
        "staff": {
            "waiters": waiters,
            "chefs":   chefs,
            "stations": {"grill": grill, "bar": bar, "host": host},
        },
        "ingredients": ingredients,
    }


@app.get("/")
def root():
    return {"message": "Restaurant Forecaster API => For testing purpose"}


@app.post("/predict")
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not trained")
    return _predict_hour(
        req.hour, req.is_weekend, req.is_rain,
        req.current_chicken_stock, req.current_rice_stock,
        req.chicken_stock_age_days, req.rice_stock_age_days,
    )


@app.post("/predict-day")
def predict_day(req: PredictDayRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not trained")

    result = []
    for hour in range(8, 23):
        hourly = _predict_hour(
            hour, req.is_weekend, req.is_rain,
            req.current_chicken_stock, req.current_rice_stock,
            req.chicken_stock_age_days, req.rice_stock_age_days,
        )
        hourly["hour"] = hour
        result.append(hourly)
    return result


@app.post("/feedback")
def feedback(req: FeedbackRequest):
    with open(DATA_FILE, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([req.hour, req.is_weekend, req.is_rain, req.actual_customers])

    train_model()
    return {"message": "Feedback saved and model retrained"}
