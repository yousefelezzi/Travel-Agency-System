import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  emptyQuiz,
  loadQuiz,
  saveQuiz,
  savePlannerDraft,
} from "../utils/preferences";
import { recommend, quizToPlannerForm } from "../utils/recommend";

const STYLES = [
  { id: "relaxation", label: "Relax" },
  { id: "adventure", label: "Adventure" },
  { id: "culture", label: "Culture" },
  { id: "luxury", label: "Luxury" },
  { id: "party", label: "Party" },
  { id: "nature", label: "Nature" },
];

const BUDGETS = [
  { id: "under-500", label: "Under $500" },
  { id: "500-1000", label: "$500 – $1,000" },
  { id: "1000-3000", label: "$1,000 – $3,000" },
  { id: "3000+", label: "$3,000+" },
];

const TRAVELERS = [
  { id: "solo", label: "Solo" },
  { id: "couple", label: "Couple" },
  { id: "friends", label: "Friends" },
  { id: "family", label: "Family" },
];

const handleImgError = (fallback) => (e) => {
  if (e.target.src !== fallback) e.target.src = fallback;
};

export default function Build() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("inputs"); // inputs | results
  const [destinationMode, setDestinationMode] = useState("known"); // known | unsure
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [groupType, setGroupType] = useState("");
  const [vibe, setVibe] = useState([]);

  useEffect(() => {
    const q = loadQuiz();
    if (q) {
      if (q.budget) setBudget(q.budget);
      if (q.groupType) setGroupType(q.groupType);
      if (q.vibe?.length) setVibe(q.vibe);
    }
  }, []);

  const toggleVibe = (id) =>
    setVibe((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const d = Math.ceil(
      (new Date(endDate) - new Date(startDate)) / 86400000
    );
    return Math.max(0, d);
  }, [startDate, endDate]);

  const durationBucket = useMemo(() => {
    if (!days) return "";
    if (days <= 3) return "weekend";
    if (days <= 5) return "3-5";
    if (days <= 9) return "1-week";
    return "2-weeks";
  }, [days]);

  const canSubmit =
    (destinationMode === "unsure" || destination.trim().length > 0) &&
    budget &&
    groupType &&
    vibe.length > 0;

  const buildPrefs = () => ({
    ...emptyQuiz(),
    vibe,
    budget,
    duration: durationBucket || "1-week",
    groupType,
    climate: "any",
    activities: [],
    region: "anywhere",
  });

  const matches = useMemo(() => {
    if (stage !== "results") return [];
    return recommend(buildPrefs(), 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, vibe, budget, groupType, durationBucket]);

  const filteredMatches = useMemo(() => {
    if (destinationMode === "unsure" || !destination.trim()) return matches;
    const needle = destination.trim().toLowerCase();
    const direct = matches.filter(
      (m) =>
        m.destination.name.toLowerCase().includes(needle) ||
        m.destination.country.toLowerCase().includes(needle)
    );
    return direct.length ? direct : matches;
  }, [matches, destinationMode, destination]);

  const submit = (e) => {
    e?.preventDefault();
    if (!canSubmit) return;
    const prefs = buildPrefs();
    saveQuiz(prefs);
    setStage("results");
  };

  const sendToPlanner = (destName = "") => {
    const prefs = buildPrefs();
    saveQuiz(prefs);
    const draft = quizToPlannerForm(
      prefs,
      destName ||
        (destinationMode === "known" ? destination : "")
    );
    if (startDate) draft.startDate = startDate;
    if (endDate) draft.endDate = endDate;
    savePlannerDraft({ form: draft, fromBuild: true });
    navigate("/planner");
  };

  return (
    <div className="build-page">
      <div className="build-bg" aria-hidden="true">
        <div className="build-bg-blob build-bg-blob-a" />
        <div className="build-bg-blob build-bg-blob-b" />
      </div>

      <div className="build-shell">
        <header className="build-head">
          <span className="build-eyebrow">— Build My Trip</span>
          <h1>Tell us the shape of your trip.</h1>
          <p>
            A few quick choices and we'll surface trips that fit. Refine any of
            them with the AI Planner — your context follows you.
          </p>
        </header>

        {stage === "inputs" && (
          <form className="build-form" onSubmit={submit}>
            <section className="build-section">
              <div className="build-section-head">
                <span className="build-num">01</span>
                <h2>Where to?</h2>
              </div>
              <div className="build-toggle">
                <button
                  type="button"
                  className={`build-toggle-opt ${destinationMode === "known" ? "is-active" : ""}`}
                  onClick={() => setDestinationMode("known")}
                >
                  I have a destination
                </button>
                <button
                  type="button"
                  className={`build-toggle-opt ${destinationMode === "unsure" ? "is-active" : ""}`}
                  onClick={() => setDestinationMode("unsure")}
                >
                  I'm not sure
                </button>
              </div>
              {destinationMode === "known" ? (
                <input
                  type="text"
                  className="build-input"
                  placeholder="City, country, or region"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              ) : (
                <p className="build-hint">
                  No worries — we'll match destinations to the rest of your answers.
                </p>
              )}
            </section>

            <section className="build-section">
              <div className="build-section-head">
                <span className="build-num">02</span>
                <h2>When?</h2>
              </div>
              <div className="build-row">
                <div className="build-input-group">
                  <label>Start</label>
                  <input
                    type="date"
                    className="build-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="build-input-group">
                  <label>End</label>
                  <input
                    type="date"
                    className="build-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                {days > 0 && (
                  <span className="build-days">
                    {days} day{days === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </section>

            <section className="build-section">
              <div className="build-section-head">
                <span className="build-num">03</span>
                <h2>Budget per person</h2>
              </div>
              <div className="build-chips">
                {BUDGETS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`build-chip ${budget === b.id ? "is-active" : ""}`}
                    onClick={() => setBudget(b.id)}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="build-section">
              <div className="build-section-head">
                <span className="build-num">04</span>
                <h2>Travelers</h2>
              </div>
              <div className="build-chips">
                {TRAVELERS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`build-chip ${groupType === t.id ? "is-active" : ""}`}
                    onClick={() => setGroupType(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="build-section">
              <div className="build-section-head">
                <span className="build-num">05</span>
                <h2>Trip style</h2>
                <span className="build-section-hint">Pick one or more</span>
              </div>
              <div className="build-chips">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`build-chip ${vibe.includes(s.id) ? "is-active" : ""}`}
                    onClick={() => toggleVibe(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </section>

            <div className="build-foot">
              <button
                type="submit"
                className="btn-cta btn-cta-build-primary"
                disabled={!canSubmit}
              >
                Show suggested trips
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                className="btn-cta btn-cta-build-ghost"
                onClick={() => navigate("/quiz")}
              >
                Take the Travel Quiz instead
              </button>
            </div>
          </form>
        )}

        {stage === "results" && (
          <div className="build-results">
            <div className="build-results-head">
              <h2>Suggested trips for your shape</h2>
              <button
                type="button"
                className="btn-cta btn-cta-build-ghost"
                onClick={() => setStage("inputs")}
              >
                Edit answers
              </button>
            </div>

            <div className="build-results-grid">
              {filteredMatches.map((m) => {
                const d = m.destination;
                return (
                  <article key={d.id} className="build-result-card">
                    <div className="build-result-media">
                      <img
                        src={d.image}
                        alt={`${d.name}, ${d.country}`}
                        onError={handleImgError(d.fallback)}
                        loading="lazy"
                      />
                      <span className="build-result-fit">{m.fit}</span>
                    </div>
                    <div className="build-result-body">
                      <h3>{d.name}</h3>
                      <span className="build-result-country">{d.country}</span>
                      <p className="build-result-why">{m.why}</p>
                      <div className="build-result-actions">
                        <button
                          type="button"
                          className="btn-cta btn-cta-result-primary"
                          onClick={() => sendToPlanner(d.name)}
                        >
                          Plan with AI
                        </button>
                        <button
                          type="button"
                          className="btn-cta btn-cta-result-ghost"
                          onClick={() =>
                            navigate(
                              `/packages?destination=${encodeURIComponent(d.name)}`
                            )
                          }
                        >
                          View packages
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredMatches.length === 0 && (
              <div className="build-empty">
                We couldn't find a strong match. Loosen a constraint or try the
                quiz for broader recommendations.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
