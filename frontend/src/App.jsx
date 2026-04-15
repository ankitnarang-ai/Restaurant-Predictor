import { useState } from "react";

const API = "http://localhost:8001";

const INGREDIENT_META = {
  chicken: { shelf_life_days: 2, lead_time_days: 1 },
  rice: { shelf_life_days: 30, lead_time_days: 1 },
};

function formatHour(h) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

export default function App() {
  const [form, setForm] = useState({ hour: 12, is_weekend: 0, is_rain: 0 });
  const [stocks, setStocks] = useState({
    current_chicken_stock: "",
    current_rice_stock: "",
    chicken_stock_age_days: 0,
    rice_stock_age_days: 0,
  });
  const [result, setResult] = useState(null);
  const [dayResult, setDayResult] = useState(null);
  const [actualCustomers, setActualCustomers] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: Number(value) }));
  }

  function handleStockChange(e) {
    const { name, value } = e.target;
    setStocks((s) => ({ ...s, [name]: value }));
  }

  function buildStockPayload() {
    const payload = {};
    if (stocks.current_chicken_stock !== "") {
      payload.current_chicken_stock = Number(stocks.current_chicken_stock);
      payload.chicken_stock_age_days = Number(stocks.chicken_stock_age_days);
    }
    if (stocks.current_rice_stock !== "") {
      payload.current_rice_stock = Number(stocks.current_rice_stock);
      payload.rice_stock_age_days = Number(stocks.rice_stock_age_days);
    }
    return payload;
  }

  async function predict() {
    setLoading(true);
    setFeedbackMsg("");
    try {
      const res = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...buildStockPayload() }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function predictDay() {
    setLoadingDay(true);
    try {
      const res = await fetch(`${API}/predict-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_weekend: form.is_weekend,
          is_rain: form.is_rain,
          ...buildStockPayload(),
        }),
      });
      if (!res.ok) {
        console.error("predict-day failed:", res.status, await res.text());
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.error("predict-day returned unexpected data:", data);
        return;
      }
      setDayResult(data);
    } finally {
      setLoadingDay(false);
    }
  }

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

  const hasChickenStock = stocks.current_chicken_stock !== "";
  const hasRiceStock = stocks.current_rice_stock !== "";

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h2>Restaurant Forecaster</h2>

      {/* ── Inputs ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label>
          Hour (0–23)<br />
          <input type="number" name="hour" min={0} max={23} value={form.hour}
            onChange={handleChange} style={{ width: "100%", padding: 6, marginTop: 4 }} />
        </label>

        <label>
          Day type<br />
          <select name="is_weekend" value={form.is_weekend} onChange={handleChange}
            style={{ width: "100%", padding: 6, marginTop: 4 }}>
            <option value={0}>Weekday</option>
            <option value={1}>Weekend</option>
          </select>
        </label>

        <label>
          Weather<br />
          <select name="is_rain" value={form.is_rain} onChange={handleChange}
            style={{ width: "100%", padding: 6, marginTop: 4 }}>
            <option value={0}>Clear</option>
            <option value={1}>Rain</option>
          </select>
        </label>

        {/* ── Stock inputs ── */}
        <fieldset style={{ border: "1px solid #ddd", borderRadius: 6, padding: "10px 14px" }}>
          <legend style={{ fontSize: 13, color: "#555" }}>Current Stock (optional)</legend>
          <div style={{ display: "flex", gap: 12 }}>

            <div style={{ flex: 1 }}>
              <label>Chicken stock (kg)<br />
                <input type="number" name="current_chicken_stock" min={0}
                  value={stocks.current_chicken_stock} onChange={handleStockChange}
                  placeholder="e.g. 20" style={{ width: "100%", padding: 6, marginTop: 4 }} />
              </label>
              {hasChickenStock && (
                <label style={{ marginTop: 6, display: "block" }}>
                  Age of chicken stock (days)<br />
                  <input type="number" name="chicken_stock_age_days" min={0} max={10}
                    value={stocks.chicken_stock_age_days} onChange={handleStockChange}
                    style={{ width: "100%", padding: 6, marginTop: 4 }} />
                </label>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <label>Rice stock (kg)<br />
                <input type="number" name="current_rice_stock" min={0}
                  value={stocks.current_rice_stock} onChange={handleStockChange}
                  placeholder="e.g. 10" style={{ width: "100%", padding: 6, marginTop: 4 }} />
              </label>
              {hasRiceStock && (
                <label style={{ marginTop: 6, display: "block" }}>
                  Age of rice stock (days)<br />
                  <input type="number" name="rice_stock_age_days" min={0} max={30}
                    value={stocks.rice_stock_age_days} onChange={handleStockChange}
                    style={{ width: "100%", padding: 6, marginTop: 4 }} />
                </label>
              )}
            </div>

          </div>
        </fieldset>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={predict} disabled={loading}
            style={{ flex: 1, padding: "8px 16px", cursor: "pointer" }}>
            {loading ? "Predicting…" : "Predict Hour"}
          </button>
          <button onClick={predictDay} disabled={loadingDay}
            style={{ flex: 1, padding: "8px 16px", cursor: "pointer" }}>
            {loadingDay ? "Predicting…" : "Predict Full Day"}
          </button>
        </div>
      </div>

      {/* ── Single-hour result ── */}
      {result && (
        <div style={{ marginTop: 24, borderTop: "1px solid #ccc", paddingTop: 16 }}>
          <h3>Prediction – {formatHour(form.hour)}</h3>
          <p><strong>Customers:</strong> {result.customers}</p>

          <h4>Staff needed</h4>
          <p>Waiters: {result.staff.waiters} &nbsp;|&nbsp; Chefs: {result.staff.chefs}</p>
          {result.staff.stations && (
            <p style={{ color: "#555", fontSize: 13 }}>
              Stations → Grill: {result.staff.stations.grill} &nbsp;|&nbsp;
              Bar: {result.staff.stations.bar} &nbsp;|&nbsp;
              Host: {result.staff.stations.host}
            </p>
          )}

          <h4>Ingredients</h4>
          <p>
            Dishes: {result.ingredients.dishes} &nbsp;|&nbsp;
            Chicken: {result.ingredients.chicken_kg} kg
            <span style={{ color: "#888", fontSize: 12 }}>
              &nbsp;(shelf life: {INGREDIENT_META.chicken.shelf_life_days}d,
              lead time: {INGREDIENT_META.chicken.lead_time_days}d)
            </span>
            &nbsp;|&nbsp;
            Rice: {result.ingredients.rice_kg} kg
            <span style={{ color: "#888", fontSize: 12 }}>
              &nbsp;(shelf life: {INGREDIENT_META.rice.shelf_life_days}d,
              lead time: {INGREDIENT_META.rice.lead_time_days}d)
            </span>
          </p>
          {result.ingredients.chicken_order_required !== undefined && (
            <p style={{ color: result.ingredients.chicken_order_required > 0 ? "red" : "green" }}>
              Chicken to order: {result.ingredients.chicken_order_required} kg
            </p>
          )}
          {result.ingredients.rice_order_required !== undefined && (
            <p style={{ color: result.ingredients.rice_order_required > 0 ? "red" : "green" }}>
              Rice to order: {result.ingredients.rice_order_required} kg
            </p>
          )}

          <hr />
          <h4>Submit actual customers (for retraining)</h4>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" placeholder="Actual customers" value={actualCustomers}
              onChange={(e) => setActualCustomers(e.target.value)}
              style={{ flex: 1, padding: 6 }} />
            <button onClick={sendFeedback} style={{ padding: "6px 14px", cursor: "pointer" }}>
              Submit
            </button>
          </div>
          {feedbackMsg && <p style={{ color: "green", marginTop: 8 }}>{feedbackMsg}</p>}
        </div>
      )}

      {/* ── Full-day result ── */}
      {dayResult && (
        <div style={{ marginTop: 24, borderTop: "1px solid #ccc", paddingTop: 16 }}>
          <h3>Full Day Forecast</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={th}>Time</th>
                  <th style={th}>Customers</th>
                  <th style={th}>Waiters</th>
                  <th style={th}>Chefs</th>
                  <th style={th}>Grill</th>
                  <th style={th}>Bar</th>
                  <th style={th}>Host</th>
                  <th style={th}>Chicken (kg)</th>
                  <th style={th}>Rice (kg)</th>
                  {dayResult[0]?.ingredients.chicken_order_required !== undefined && <th style={th}>Order Chicken</th>}
                  {dayResult[0]?.ingredients.rice_order_required !== undefined && <th style={th}>Order Rice</th>}
                </tr>
              </thead>
              <tbody>
                {dayResult.map((row) => (
                  <tr key={row.hour} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={td}><strong>{formatHour(row.hour)}</strong></td>
                    <td style={td}>{row.customers}</td>
                    <td style={td}>{row.staff.waiters}</td>
                    <td style={td}>{row.staff.chefs}</td>
                    <td style={td}>{row.staff.stations.grill}</td>
                    <td style={td}>{row.staff.stations.bar}</td>
                    <td style={td}>{row.staff.stations.host}</td>
                    <td style={td}>{row.ingredients.chicken_kg}</td>
                    <td style={td}>{row.ingredients.rice_kg}</td>
                    {row.ingredients.chicken_order_required !== undefined && (
                      <td style={{ ...td, color: row.ingredients.chicken_order_required > 0 ? "red" : "green" }}>
                        {row.ingredients.chicken_order_required}
                      </td>
                    )}
                    {row.ingredients.rice_order_required !== undefined && (
                      <td style={{ ...td, color: row.ingredients.rice_order_required > 0 ? "red" : "green" }}>
                        {row.ingredients.rice_order_required}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { padding: "8px 10px", textAlign: "left", fontWeight: 600 };
const td = { padding: "6px 10px" };
