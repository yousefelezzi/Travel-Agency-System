import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Icon } from "../components/Icons";
import PlannerChat from "../components/PlannerChat";
import { DESTINATIONS } from "../data/destinations";
import {
  clearPlannerDraft,
  emptyQuiz,
  hasQuiz,
  loadPlannerDraft,
  loadQuiz,
  saveQuiz,
} from "../utils/preferences";
import { buildPlannerContext, quizToPlannerForm, recommend } from "../utils/recommend";

const STAGE = {
  ONBOARDING: "onboarding",
  DIRECTIONS: "directions",
  FORM: "form",
  RESULT: "result",
};

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

const ONBOARDING_STEPS = [
  {
    id: "vibe",
    multi: true,
    minSelection: 1,
    title: "What's your travel vibe?",
    sub: "Pick one or more — we'll shape suggestions around it.",
    options: [
      { id: "relaxation", label: "Relaxation" },
      { id: "adventure", label: "Adventure" },
      { id: "culture", label: "Culture" },
      { id: "luxury", label: "Luxury" },
      { id: "party", label: "Party" },
      { id: "nature", label: "Nature" },
    ],
  },
  {
    id: "budget",
    multi: false,
    title: "What's your budget per person?",
    options: [
      { id: "under-500", label: "Under $500" },
      { id: "500-1000", label: "$500 – $1,000" },
      { id: "1000-3000", label: "$1,000 – $3,000" },
      { id: "3000+", label: "$3,000+" },
    ],
  },
  {
    id: "duration",
    multi: false,
    title: "How long is the trip?",
    options: [
      { id: "weekend", label: "Weekend" },
      { id: "3-5", label: "3 – 5 days" },
      { id: "1-week", label: "1 week" },
      { id: "2-weeks", label: "2+ weeks" },
    ],
  },
  {
    id: "groupType",
    multi: false,
    title: "Who are you traveling with?",
    options: [
      { id: "solo", label: "Solo" },
      { id: "couple", label: "Couple" },
      { id: "friends", label: "Friends" },
      { id: "family", label: "Family" },
    ],
  },
];

const VIBE_LABEL = {
  relaxation: "relaxing",
  adventure: "adventure",
  culture: "culture-rich",
  luxury: "luxury",
  party: "high-energy",
  nature: "nature-focused",
};
const BUDGET_LABEL = {
  "under-500": "under $500",
  "500-1000": "$500–$1,000",
  "1000-3000": "$1,000–$3,000",
  "3000+": "$3,000+",
};
const DURATION_LABEL = {
  weekend: "weekend",
  "3-5": "3–5 day",
  "1-week": "one-week",
  "2-weeks": "2+ week",
};
const GROUP_LABEL = {
  solo: "solo",
  couple: "with your partner",
  friends: "with friends",
  family: "with family",
};
const CLIMATE_LABEL = {
  warm: "warm",
  cold: "cool",
  any: "any-climate",
};
const ACTIVITY_LABEL = {
  beaches: "beaches",
  hiking: "hiking",
  food: "food",
  nightlife: "nightlife",
  history: "history",
  shopping: "shopping",
};

const summarize = (prefs, destinationName) => {
  const bits = [];
  bits.push("You're planning");
  if (prefs.duration) bits.push("a " + DURATION_LABEL[prefs.duration] + " trip");
  else bits.push("a trip");
  if (prefs.vibe?.length) {
    const vibes = prefs.vibe.map((v) => VIBE_LABEL[v] || v).join(", ");
    bits.push("with a " + vibes + " vibe");
  }
  if (prefs.climate && prefs.climate !== "any")
    bits.push("in a " + CLIMATE_LABEL[prefs.climate] + " destination");
  if (destinationName) bits.push("to " + destinationName);
  if (prefs.groupType) bits.push("traveling " + GROUP_LABEL[prefs.groupType]);
  if (prefs.budget) bits.push("with a " + BUDGET_LABEL[prefs.budget] + " budget");
  if (prefs.activities?.length) {
    const acts = prefs.activities.map((a) => ACTIVITY_LABEL[a] || a).join(", ");
    bits.push("interested in " + acts);
  }
  return bits.join(" ") + ".";
};

const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

// Central display helper — never show "$0" when data is missing or invalid.
// Returns either a money string or a placeholder.
const displayTotal = (n) => {
  if (n === null || n === undefined) return "Price unavailable";
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return "Price unavailable";
  return `$${num.toFixed(2)}`;
};

// Helper to detect whether a plan actually has any priced picks. Used to
// decide whether the booking CTAs are usable.
const planHasInventory = (plan) =>
  !!(plan && (plan.chosenFlight || plan.chosenHotel || plan.chosenPackage));
const fmtDate = (d) =>
  new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

const handleImgError = (fallback) => (e) => {
  if (e.target.src !== fallback) e.target.src = fallback;
};

// ─── Onboarding (mini quiz when user lands without one) ──────────────────
function Onboarding({ initial, onComplete, onSkipToQuiz }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ ...emptyQuiz(), ...(initial || {}) });
  const total = ONBOARDING_STEPS.length;
  const cur = ONBOARDING_STEPS[step];
  const value = answers[cur.id];
  const ok = cur.multi
    ? Array.isArray(value) && value.length >= (cur.minSelection || 1)
    : !!value;

  const select = (id) => {
    setAnswers((p) => {
      if (cur.multi) {
        const list = p[cur.id] || [];
        const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
        return { ...p, [cur.id]: next };
      }
      return { ...p, [cur.id]: id };
    });
  };

  const next = () => {
    if (!ok) return;
    if (step < total - 1) setStep(step + 1);
    else onComplete(answers);
  };

  const isSelected = (id) =>
    cur.multi ? (value || []).includes(id) : value === id;

  return (
    <section className="pl-onboard">
      <header className="pl-onboard-head">
        <button
          type="button"
          className="pl-onboard-back"
          onClick={() => (step === 0 ? onSkipToQuiz() : setStep(step - 1))}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {step === 0 ? "Take the full quiz" : "Back"}
        </button>
        <div className="pl-onboard-progress">
          <div
            className="pl-onboard-progress-bar"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
        <span className="pl-onboard-count">
          {step + 1} / {total}
        </span>
      </header>

      <div className="pl-onboard-text">
        <span className="pl-onboard-eyebrow">— Quick setup</span>
        <h1>{cur.title}</h1>
        {cur.sub && <p>{cur.sub}</p>}
      </div>

      <div className="pl-onboard-options">
        {cur.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`pl-onboard-option ${isSelected(opt.id) ? "is-selected" : ""}`}
            onClick={() => select(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="pl-onboard-foot">
        <button
          type="button"
          className="btn-cta btn-cta-quiz-next"
          onClick={next}
          disabled={!ok}
        >
          {step < total - 1 ? "Continue" : "See suggestions"}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
}

// ─── Direction cards ──────────────────────────────────────────────────────
function DirectionCard({ match, onPick }) {
  const d = match.destination;
  return (
    <article className="pl-dir-card">
      <div className="pl-dir-media">
        <img
          src={d.image}
          alt={`${d.name}, ${d.country}`}
          onError={handleImgError(d.fallback)}
          loading="lazy"
        />
        <span className="pl-dir-fit">{match.fit}</span>
      </div>
      <div className="pl-dir-body">
        <div className="pl-dir-head">
          <h3>{d.name}</h3>
          <span className="pl-dir-country">{d.country}</span>
        </div>
        <div className="pl-dir-meta">
          <span>{d.nightsTypical}N typical</span>
          <span className="pl-dir-meta-dot">·</span>
          <span>from ${d.priceFrom.toLocaleString()}</span>
        </div>
        <div className="pl-dir-tags">
          {(d.tags.activities || []).slice(0, 3).map((a) => (
            <span key={a} className="pl-dir-tag">{a}</span>
          ))}
        </div>
        <p className="pl-dir-why">{match.why}</p>
        <button type="button" className="pl-dir-cta" onClick={() => onPick(match)}>
          Build this trip
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </article>
  );
}

// ─── Plan picks (flight / hotel / package — same as before but compact) ─
function PlanPick({ kind, item, navigate, travelers, nights, highlight }) {
  if (!item) return null;
  const isFlight = kind === "flight";
  const isHotel = kind === "hotel";
  const isPkg = kind === "package";
  return (
    <div className={`plan-pick ${highlight ? "plan-pick--changed" : ""}`}>
      <div className="plan-pick__head">
        <div className={`bd-airline-mark ${!isFlight ? "bd-airline-mark--alt" : ""}`}>
          {isFlight ? item.airlineName?.charAt(0) || "✈" : isHotel ? <Icon.Hotel width="18" height="18" /> : <Icon.Package width="18" height="18" />}
        </div>
        <div className="plan-pick__title">
          <h3>
            {isFlight && `${item.departurePort} → ${item.arrivalPort}`}
            {isHotel && item.name}
            {isPkg && item.packageName}
          </h3>
          <span>
            {isFlight && `${item.airlineName} · ${item.flightNumber}`}
            {isHotel && `${item.city}, ${item.country}${item.starRating ? ` · ${"★".repeat(item.starRating)}` : ""}`}
            {isPkg && item.discount > 0 && `${Number(item.discount)}% off`}
          </span>
        </div>
        <span className="bd-chip">{isFlight ? "Flight" : isHotel ? "Stay" : "Package"}</span>
      </div>
      {isFlight && (
        <div className="plan-pick__meta">
          <span><Icon.Calendar width="13" height="13" /> {fmtDate(item.departureDate)}</span>
          <span><Icon.Clock width="13" height="13" /> {fmtTime(item.departureDate)} – {fmtTime(item.arrivalDate)}</span>
          <span><Icon.Dollar width="13" height="13" /> {fmtMoney(item.economyPrice)} / seat</span>
        </div>
      )}
      {isHotel && (
        <div className="plan-pick__meta">
          <span><Icon.Pin width="13" height="13" /> {item.city}</span>
          <span><Icon.Dollar width="13" height="13" /> {fmtMoney(item.pricePerNight)} / night</span>
          {nights > 0 && <span>{nights} night{nights === 1 ? "" : "s"}</span>}
        </div>
      )}
      {isPkg && item.description && <p className="plan-pick__desc">{item.description}</p>}
      <div className="plan-pick__foot">
        <strong>
          {isFlight && fmtMoney(Number(item.economyPrice) * (travelers || 1))}
          {isHotel && (nights > 0 ? fmtMoney(Number(item.pricePerNight) * nights) : fmtMoney(item.pricePerNight))}
          {isPkg && fmtMoney(Number(item.price) * (1 - Number(item.discount || 0) / 100))}
        </strong>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate(`/book?type=${kind}&id=${item.id}`)}
        >
          Book {isFlight ? "flight" : isHotel ? "stay" : "package"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Planner page ────────────────────────────────────────────────────
export default function Planner() {
  const navigate = useNavigate();

  const [stage, setStage] = useState(null);
  const [prefs, setPrefs] = useState(emptyQuiz());
  const [chosenDirection, setChosenDirection] = useState(null);
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
  const [planEnvelope, setPlanEnvelope] = useState(null);
  const [highlightUntil, setHighlightUntil] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(null);
  const cameFromQuiz = useMemo(() => hasQuiz(), []);
  const initialized = useRef(false);

  // Determine starting stage on mount.
  // Guarded with a ref so React 18+ StrictMode double-invocation doesn't
  // consume the planner draft on the first pass and then reset to DIRECTIONS
  // on the second pass.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const draft = loadPlannerDraft();
    const quiz = loadQuiz();
    if (quiz) setPrefs(quiz);

    if (draft?.form) {
      setForm((f) => ({ ...f, ...draft.form }));
      // If the draft carries a destination name, restore chosenDirection
      // so the form banner reads "Editing your <City> plan".
      const destName = draft.destinationName || draft.form.destination;
      if (destName) {
        const destEntry = DESTINATIONS.find(
          (d) => d.name.toLowerCase() === destName.toLowerCase()
        );
        if (destEntry) {
          setChosenDirection({
            destination: destEntry,
            why: "",
            fit: "Selected",
            score: 0,
            reasons: [],
          });
        }
      }
      clearPlannerDraft();
      setStage(draft.form.destination ? STAGE.FORM : STAGE.DIRECTIONS);
      return;
    }

    if (quiz) {
      const derived = quizToPlannerForm(quiz, "");
      setForm((f) => ({ ...f, ...derived }));
      setStage(STAGE.DIRECTIONS);
    } else {
      setStage(STAGE.ONBOARDING);
    }
  }, []);

  const aiContext = useMemo(() => buildPlannerContext(prefs), [prefs]);
  const directions = useMemo(() => recommend(prefs, 4), [prefs]);
  const summary = useMemo(
    () => summarize(prefs, chosenDirection?.destination?.name),
    [prefs, chosenDirection]
  );

  const nights = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    return Math.max(
      0,
      Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 86400000)
    );
  }, [form]);

  const handleOnboardingComplete = (newPrefs) => {
    saveQuiz(newPrefs);
    setPrefs(newPrefs);
    const derived = quizToPlannerForm(newPrefs, "");
    setForm((f) => ({ ...f, ...derived }));
    setStage(STAGE.DIRECTIONS);
  };

  const handlePickDirection = (match) => {
    setChosenDirection(match);
    const derived = quizToPlannerForm(prefs, match.destination.name);
    setForm((f) => ({ ...f, ...derived, destination: match.destination.name }));
    setStage(STAGE.FORM);
  };

  const toggleInterest = (id) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(id)
        ? f.interests.filter((x) => x !== id)
        : [...f.interests, id],
    }));
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!form.destination) {
      setError("Pick or enter a destination first.");
      return;
    }
    setError("");
    setLoading(true);
    setPlanEnvelope(null);
    try {
      const payload = {
        ...form,
        budget: form.budget ? Number(form.budget) : null,
      };
      if (aiContext) payload.context = aiContext;
      const res = await api.post("/planner/generate", payload);
      setPlanEnvelope(res.data);
      setStage(STAGE.RESULT);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Could not generate a plan.");
    } finally {
      setLoading(false);
    }
  };

  const refinePlan = async (instruction, history = []) => {
    if (!planEnvelope) throw new Error("No plan to refine");
    const isDev = process.env.NODE_ENV !== "production";

    // Strip hydrated full records from the plan we send back — server hydrates again
    const { chosenFlight, chosenHotel, chosenPackage, ...slim } = planEnvelope.plan;

    if (isDev) {
      console.log("[planner.refine] BEFORE", {
        instruction,
        flightId: slim.chosenFlightId,
        hotelId: slim.chosenHotelId,
        packageId: slim.chosenPackageId,
        days: slim.days?.length,
        extrasTotal: slim.extrasTotal,
        estimatedTotal: slim.estimatedTotal,
      });
    }

    const res = await api.post("/planner/refine", {
      prefs: { ...form, context: aiContext },
      plan: slim,
      instruction,
      history,
    });

    const prevTotal =
      typeof res.data.previousTotal === "number"
        ? res.data.previousTotal
        : Number(planEnvelope.plan.estimatedTotal) || 0;

    if (isDev) {
      console.log("[planner.refine] AFTER", {
        change: res.data.change,
        previousTotal: prevTotal,
        newTotal: res.data.plan.estimatedTotal,
        flightId: res.data.plan.chosenFlightId,
        hotelId: res.data.plan.chosenHotelId,
        packageId: res.data.plan.chosenPackageId,
        days: res.data.plan.days?.length,
        extrasTotal: res.data.plan.extrasTotal,
        delta: Number(res.data.plan.estimatedTotal) - prevTotal,
      });
    }

    setPreviousTotal(prevTotal);
    setPlanEnvelope((prev) => ({
      ...prev,
      plan: res.data.plan,
    }));
    // If Claude/fallback swapped destinations, mirror that into the form
    if (res.data.plan.newDestination) {
      setForm((f) => ({ ...f, destination: res.data.plan.newDestination }));
    }
    setHighlightUntil(Date.now() + 4500);
    return res.data.change;
  };

  const goBackToDirections = () => {
    setPlanEnvelope(null);
    setChosenDirection(null);
    setError("");
    setStage(STAGE.DIRECTIONS);
  };

  const isHighlighted = Date.now() < highlightUntil;

  // ─── Render ──────────────────────────────────────────────────────────
  if (stage === null) return null;

  return (
    <div className="plan-page">
      <div className="plan-page__bg" aria-hidden />
      <div className="plan-page__inner">
        <header className="plan-hero pl-summary-hero">
          <div>
            <div className="plan-hero__eyebrow">AI Travel Concierge</div>
            <h1>
              {stage === STAGE.ONBOARDING && "Let's get you a plan."}
              {stage === STAGE.DIRECTIONS && "Where you might love to go."}
              {stage === STAGE.FORM && "Edit the shape of your trip."}
              {stage === STAGE.RESULT && "Your plan is ready."}
            </h1>
            {stage !== STAGE.ONBOARDING && (
              <p className="pl-summary-line">{summary}</p>
            )}
          </div>
          {stage !== STAGE.ONBOARDING && (
            <div className="pl-stage-stepper">
              {[
                { id: STAGE.DIRECTIONS, label: "Suggestions" },
                { id: STAGE.FORM, label: "Edit" },
                { id: STAGE.RESULT, label: "Plan" },
              ].map((s, i) => (
                <div
                  key={s.id}
                  className={`pl-step ${stage === s.id ? "is-active" : ""} ${
                    [STAGE.DIRECTIONS, STAGE.FORM, STAGE.RESULT].indexOf(stage) > i
                      ? "is-done"
                      : ""
                  }`}
                >
                  <span className="pl-step-num">{i + 1}</span>
                  <span className="pl-step-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* ── ONBOARDING ── */}
        {stage === STAGE.ONBOARDING && (
          <Onboarding
            initial={prefs}
            onComplete={handleOnboardingComplete}
            onSkipToQuiz={() => navigate("/quiz")}
          />
        )}

        {/* ── DIRECTIONS ── */}
        {stage === STAGE.DIRECTIONS && (
          <section className="pl-directions">
            <div className="pl-directions-head">
              <h2>Suggested directions</h2>
              <p>
                Picked from your profile. Choose one to start editing the plan,
                or {cameFromQuiz ? "tweak your inputs" : "retake the quiz"}.
              </p>
              <button
                type="button"
                className="pl-link-btn"
                onClick={() => navigate("/quiz")}
              >
                {cameFromQuiz ? "Edit quiz answers" : "Retake the quiz"}
              </button>
            </div>
            {directions.length === 0 ? (
              <div className="pl-empty">
                We couldn't pick directions yet. Try the quiz or jump to manual editing.
                <div className="pl-empty-actions">
                  <button
                    type="button"
                    className="btn-cta btn-cta-quiz-next"
                    onClick={() => navigate("/quiz")}
                  >
                    Take the Travel Quiz
                  </button>
                  <button
                    type="button"
                    className="btn-cta btn-cta-build-ghost"
                    onClick={() => setStage(STAGE.FORM)}
                  >
                    Skip — edit manually
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="pl-directions-grid">
                  {directions.map((m) => (
                    <DirectionCard
                      key={m.destination.id}
                      match={m}
                      onPick={handlePickDirection}
                    />
                  ))}
                </div>
                <div className="pl-directions-foot">
                  <button
                    type="button"
                    className="btn-cta btn-cta-build-ghost"
                    onClick={() => setStage(STAGE.FORM)}
                  >
                    None of these — let me enter one manually
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── FORM ── */}
        {stage === STAGE.FORM && (
          <form onSubmit={handleGenerate} className="plan-form">
            <div className="pl-form-banner">
              <strong>
                {chosenDirection
                  ? `Editing your ${chosenDirection.destination.name} plan`
                  : "Edit your trip"}
              </strong>
              <span>
                Pre-filled from your profile. Adjust anything before we design the trip.
              </span>
              <button
                type="button"
                className="pl-link-btn"
                onClick={() => setStage(STAGE.DIRECTIONS)}
              >
                ← Back to suggestions
              </button>
            </div>

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
              {loading ? "Designing your trip based on your preferences…" : "Generate My Itinerary"}
            </button>
          </form>
        )}

        {/* ── LOADING (between FORM and RESULT) ── */}
        {loading && stage !== STAGE.RESULT && (
          <div className="plan-loader">
            <div className="plan-loader__spinner" />
            <p>Designing your trip based on your preferences…</p>
          </div>
        )}

        {/* ── RESULT ── */}
        {stage === STAGE.RESULT && planEnvelope && (
          <section className="pl-result-shell">
            <div className="pl-result-main">
              <div className="plan-result__top">
                <div>
                  <div className="plan-result__eyebrow">
                    Your plan is ready
                    {planEnvelope.plan._mode === "fallback" && (
                      <span className="plan-result__badge">demo mode</span>
                    )}
                  </div>
                  <h2>{planEnvelope.plan.summary}</h2>
                  {planEnvelope.plan.rationale && (
                    <p className="plan-result__rationale">
                      {planEnvelope.plan.rationale}
                    </p>
                  )}
                </div>
                <div
                  className={`plan-result__total ${isHighlighted ? "plan-result__total--flash" : ""}`}
                >
                  <span>Estimated total</span>
                  <strong>{displayTotal(planEnvelope.plan.estimatedTotal)}</strong>
                  {isHighlighted &&
                    previousTotal != null &&
                    Number(planEnvelope.plan.estimatedTotal) > 0 &&
                    Math.abs(
                      Number(planEnvelope.plan.estimatedTotal) - previousTotal
                    ) > 0.01 && (
                      <span className="plan-result__total-was">
                        was <s>{fmtMoney(previousTotal)}</s>
                      </span>
                    )}
                </div>
              </div>

              <div className={`plan-picks ${isHighlighted ? "plan-picks--flash" : ""}`}>
                <PlanPick kind="flight" item={planEnvelope.plan.chosenFlight} navigate={navigate} travelers={form.travelers} nights={nights} highlight={isHighlighted} />
                <PlanPick kind="hotel" item={planEnvelope.plan.chosenHotel} navigate={navigate} travelers={form.travelers} nights={nights} highlight={isHighlighted} />
                <PlanPick kind="package" item={planEnvelope.plan.chosenPackage} navigate={navigate} travelers={form.travelers} nights={nights} highlight={isHighlighted} />
              </div>

              {!planHasInventory(planEnvelope.plan) && (
                <div className="alert alert-info plan-empty-picks">
                  No matching flights, stays, or packages in our inventory for that
                  destination yet — that's why the total above reads "Price unavailable."
                  Here's a suggested itinerary anyway, or try a different destination.
                </div>
              )}

              <section className="plan-itinerary">
                <div className="plan-itinerary__head">
                  <Icon.Calendar width="18" height="18" />
                  <h3>Day-by-day</h3>
                  <span>{planEnvelope.plan.days?.length || 0} days</span>
                </div>
                <ol className="plan-days">
                  {planEnvelope.plan.days?.map((d) => (
                    <li key={d.day} className={`plan-day ${isHighlighted ? "plan-day--flash" : ""}`}>
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
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    navigate(
                      `/packages${form.destination ? `?destination=${encodeURIComponent(form.destination)}` : ""}`
                    )
                  }
                >
                  View Packages
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setStage(STAGE.FORM)}
                >
                  Customize Further
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={goBackToDirections}
                >
                  Plan another trip
                </button>
              </div>
            </div>

            <PlannerChat
              onRefine={refinePlan}
              currentDestination={form.destination}
            />
          </section>
        )}
      </div>
    </div>
  );
}
