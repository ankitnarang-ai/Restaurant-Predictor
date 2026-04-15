import { useState } from "react";

const API = "http://localhost:8001";

export default function App() {

  /**
   * States for the form
   * States for the result
   * States for the feedback
   * States for the loading
   * Statue for the actual result
   */
  const [form, setForm] = useState({ hour: 12, is_weekend: 0, is_rain: 0 });
  const [result, setResult] = useState(null);
  const [actualCustomers, setActualCustomers] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Function to handle change event in input fields
   * @param {*} e
   * @returns {void}
   */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: Number(value) }));
  }

  /**
   * Call predict api
   * @input {null}
   * @returns {void}
   */
  async function predict() {
    setLoading(true);
    setFeedbackMsg("");
    try {
      const res = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  /**
   * Call feedback api
   * @input {null}
   * @returns {void}
   */
  async function sendFeedback() {
    if (!actualCustomers) return;
    const res = await fetch(`${API}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, actual_customers: Number(actualCustomers) }),
    });
    const data = await res.json();
    setFeedbackMsg(data.message);
    setActualCustomers("");
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h2>Restaurant Forecaster</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label>
          Hour (0–23)
          <br />
          <input
            type="number"
            name="hour"
            min={0}
            max={23}
            value={form.hour}
            onChange={handleChange}
            style={{ width: "100%", padding: 6, marginTop: 4 }}
          />
        </label>

        <label>
          Day type
          <br />
          <select
            name="is_weekend"
            value={form.is_weekend}
            onChange={handleChange}
            style={{ width: "100%", padding: 6, marginTop: 4 }}
          >
            <option value={0}>Weekday</option>
            <option value={1}>Weekend</option>
          </select>
        </label>

        <label>
          Weather
          <br />
          <select
            name="is_rain"
            value={form.is_rain}
            onChange={handleChange}
            style={{ width: "100%", padding: 6, marginTop: 4 }}
          >
            <option value={0}>Clear</option>
            <option value={1}>Rain</option>
          </select>
        </label>

        <button onClick={predict} disabled={loading} style={{ padding: "8px 16px", cursor: "pointer" }}>
          {loading ? "Predicting…" : "Predict"}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 24, borderTop: "1px solid #ccc", paddingTop: 16 }}>
          <h3>Prediction</h3>
          <p><strong>Customers:</strong> {result.customers}</p>

          <h4>Staff needed</h4>
          <p>Waiters: {result.staff.waiters} &nbsp;|&nbsp; Chefs: {result.staff.chefs}</p>

          <h4>Ingredients</h4>
          <p>
            Dishes: {result.ingredients.dishes} &nbsp;|&nbsp;
            Chicken: {result.ingredients.chicken_kg} kg &nbsp;|&nbsp;
            Rice: {result.ingredients.rice_kg} kg
          </p>

          <hr />
          <h4>Submit actual customers (for retraining)</h4>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              placeholder="Actual customers"
              value={actualCustomers}
              onChange={(e) => setActualCustomers(e.target.value)}
              style={{ flex: 1, padding: 6 }}
            />
            <button onClick={sendFeedback} style={{ padding: "6px 14px", cursor: "pointer" }}>
              Submit
            </button>
          </div>
          {feedbackMsg && <p style={{ color: "green", marginTop: 8 }}>{feedbackMsg}</p>}
        </div>
      )}
    </div>
  );
}
