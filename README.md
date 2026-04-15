# Restaurant Predictor

Predicts how many customers a restaurant will get based on time and conditions, then recommends staffing and ingredients.

## How it works

```
User inputs → Backend ML model → Prediction → (Optional) Feedback → Model retrains
```

1. **User enters** hour of day, weekday/weekend, and weather (clear/rain) in the frontend.
2. **Backend** runs a Random Forest model trained on historical `data.csv` to predict customer count.
3. **Response** includes:
   - Expected customers
   - Staff needed (waiters, chefs)
   - Ingredients to prepare (dishes, chicken, rice)
4. **Feedback loop** — after the shift, enter the actual customer count. The app appends it to `data.csv` and retrains the model automatically.

## Stack

| Layer    | Tech                        |
|----------|-----------------------------|
| Frontend | React + Vite                |
| Backend  | FastAPI + scikit-learn      |
| Model    | Random Forest Regressor     |
| Data     | CSV file (grows over time)  |

## Running locally

**Backend**
```bash
cd backend
uv run uvicorn main:app --reload --port 8001
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.
