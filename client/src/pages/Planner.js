import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Icon } from "../components/Icons";

const INTERESTS = [
  { id: "beach", label: "Beach" },
  { id: "culture", label: "Culture" },
  { id: "food", label: "Food" },
  { id: "adventure", label: "Adventure" },
  { id: "relax", label: "Relax" },
  { id: "nightlife", label: "Nightlife" },
];

const STYLES = [
  { id: "budget", label: "Budget" },
  { id: "balanced", label: "Balanced" },
  { id: "luxury", label: "Luxury" },
];

const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) =>
  new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

function FlightPick({ f, travelers, navigate }) {
  if (!f) return null;
  return (
    <div className="plan-pick">
      <div className="plan-pick__head">
        <div className="bd-airline-mark">{f.airlineName?.charAt(0) || "✈"}</div>
        <div className="plan-pick__title">
          <h3>
            {f.departurePort} → {f.arrivalPort}
          </h3>
          <span>
            {f.airlineName} · {f.flightNumber}
          </span>
        </div>
        <span className="bd-chip">Flight</span>
      </div>
      <div className="plan-pick__meta">
        <span><Icon.Calendar width="13" height="13" /> {fmtDate(f.departureDate)}</span>
        <span><Icon.Clock width="13" height="13" /> {fmtTime(f.departureDate)} – {fmtTime(f.arrivalDate)}</span>
        <span><Icon.Dollar width="13" height="13" /> {fmtMoney(f.economyPrice)} / seat</span>
      </div>
      <div className="plan-pick__foot">
        <strong>{fmtMoney(Number(f.economyPrice) * (travelers || 1))}</strong>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate(`/book?type=flight&id=${f.id}`)}
        >
          Book flight
        </button>
      </div>
    </div>
  );
}

function HotelPick({ h, nights, navigate }) {
  if (!h) return null;
  return (
    <div className="plan-pick">
      <div className="plan-pick__head">
        <div className="bd-airline-mark bd-airline-mark--alt">
          <Icon.Hotel width="18" height="18" />
        </div>
        <div className="plan-pick__title">
          <h3>{h.name}</h3>
          <span>
            {h.city}, {h.country}
            {h.starRating ? ` · ${"★".repeat(h.starRating)}` : ""}
          </span>
        </div>
        <span className="bd-chip">Stay</span>
      </div>
      <div className="plan-pick__meta">
        <span><Icon.Pin width="13" height="13" /> {h.city}</span>
        <span><Icon.Dollar width="13" height="13" /> {fmtMoney(h.pricePerNight)} / night</span>
        {nights > 0 && <span>{nights} night{nights === 1 ? "" : "s"}</span>}
      </div>
      <div className="plan-pick__foot">
        <strong>
          {nights > 0 ? fmtMoney(Number(h.pricePerNight) * nights) : fmtMoney(h.pricePerNight)}
        </strong>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate(`/book?type=hotel&id=${h.id}`)}
        >
          Book stay
        </button>
      </div>
    </div>
  );
}

function PackagePick({ p, navigate }) {
  if (!p) return null;
  return (
    <div className="plan-pick">
      <div className="plan-pick__head">
        <div className="bd-airline-mark bd-airline-mark--alt">
          <Icon.Package width="18" height="18" />
        </div>
        <div className="plan-pick__title">
          <h3>{p.packageName}</h3>
          {p.discount > 0 && <span>{Number(p.discount)}% off</span>}
        </div>
        <span className="bd-chip">Package</span>
      </div>
      {p.description && <p className="plan-pick__desc">{p.description}</p>}
      <div className="plan-pick__foot">
        <strong>{fmtMoney(Number(p.price) * (1 - Number(p.discount || 0) / 100))}</strong>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate(`/book?type=package&id=${p.id}`)}
        >
          Book package
        </button>
      </div>
    </div>
  );
}

export default function Planner() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    travelers: 2,
    budget: "",
    style: "balanced",
    interests: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const toggleInterest = (id) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(id)
        ? f.interests.filter((x) => x !== id)
        : [...f.interests, id],
    }));
  };

  const nights =
    form.startDate && form.endDate
      ? Math.max(0, Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 86400000))
      : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.destination && !form.startDate) {
      setError("Enter a destination or travel dates to get started.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post("/planner/generate", {
        ...form,
        budget: form.budget ? Number(form.budget) : null,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Could not generate a plan.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError("");
  };

  return (
    <div className="plan-page">
      <div className="plan-page__bg" aria-hidden />
      <div className="plan-page__inner">
        <header className="plan-hero">
          <div className="plan-hero__eyebrow">AI Travel Planner</div>
          <h1>Tell us your vibe — we'll craft the trip.</h1>
          <p>
            Share a few preferences and our planner will pick the best flight, stay, and
            day-by-day plan from our real inventory.
          </p>
        </header>

        {!result && (
          <form onSubmit={handleSubmit} className="plan-form">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="plan-form__grid">
              <div className="plan-field plan-field--wide">
                <label>Destination</label>
                <input
                  placeholder="e.g. Paris, Dubai, BEY"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                />
              </div>

              <div className="plan-field">
                <label>Travelers</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.travelers}
                  onChange={(e) => setForm({ ...form, travelers: e.target.value })}
                />
              </div>

              <div className="plan-field">
                <label>Departure</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>

              <div className="plan-field">
                <label>Return</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>

              <div className="plan-field">
                <label>Budget (USD)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Optional"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </div>
            </div>

            <div className="plan-field plan-field--wide">
              <label>Travel style</label>
              <div className="plan-chips">
                {STYLES.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className={`plan-chip ${form.style === s.id ? "is-active" : ""}`}
                    onClick={() => setForm({ ...form, style: s.id })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="plan-field plan-field--wide">
              <label>Interests</label>
              <div className="plan-chips">
                {INTERESTS.map((i) => (
                  <button
                    type="button"
                    key={i.id}
                    className={`plan-chip ${form.interests.includes(i.id) ? "is-active" : ""}`}
                    onClick={() => toggleInterest(i.id)}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg plan-submit"
              disabled={loading}
            >
              {loading ? "Crafting your trip..." : "Generate my plan"}
            </button>
          </form>
        )}

        {loading && (
          <div className="plan-loader">
            <div className="plan-loader__spinner" />
            <p>Crafting your trip — scanning flights, stays, and packages…</p>
          </div>
        )}

        {result && !loading && (
          <div className="plan-result">
            <div className="plan-result__top">
              <div>
                <div className="plan-result__eyebrow">
                  Your plan is ready
                  {result.plan._mode === "fallback" && (
                    <span className="plan-result__badge">demo mode</span>
                  )}
                </div>
                <h2>{result.plan.summary}</h2>
                {result.plan.rationale && (
                  <p className="plan-result__rationale">{result.plan.rationale}</p>
                )}
              </div>
              <div className="plan-result__total">
                <span>Estimated total</span>
                <strong>{fmtMoney(result.plan.estimatedTotal)}</strong>
              </div>
            </div>

            <div className="plan-picks">
              <FlightPick
                f={result.plan.chosenFlight}
                travelers={form.travelers}
                navigate={navigate}
              />
              <HotelPick
                h={result.plan.chosenHotel}
                nights={nights}
                navigate={navigate}
              />
              <PackagePick p={result.plan.chosenPackage} navigate={navigate} />
            </div>

            {(!result.plan.chosenFlight &&
              !result.plan.chosenHotel &&
              !result.plan.chosenPackage) && (
              <div className="alert alert-info plan-empty-picks">
                No matching inventory for that destination yet — but here's a suggested itinerary anyway.
              </div>
            )}

            <section className="plan-itinerary">
              <div className="plan-itinerary__head">
                <Icon.Calendar width="18" height="18" />
                <h3>Day-by-day</h3>
                <span>{result.plan.days?.length || 0} days</span>
              </div>
              <ol className="plan-days">
                {result.plan.days?.map((d) => (
                  <li key={d.day} className="plan-day">
                    <div className="plan-day__num">Day {d.day}</div>
                    <div className="plan-day__body">
                      <h4>{d.title}</h4>
                      <ul>
                        {(d.activities || []).map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <div className="plan-result__actions">
              <button className="btn btn-outline" onClick={reset}>
                Plan another trip
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/dashboard")}
              >
                Go to dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
