import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadQuiz, savePlannerDraft } from "../utils/preferences";
import { recommend, quizToPlannerForm } from "../utils/recommend";

const handleImgError = (fallback) => (e) => {
  if (e.target.src !== fallback) e.target.src = fallback;
};

export default function QuizResults() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    const q = loadQuiz();
    if (!q) {
      navigate("/quiz", { replace: true });
      return;
    }
    setPrefs(q);
  }, [navigate]);

  const matches = useMemo(() => (prefs ? recommend(prefs, 5) : []), [prefs]);

  const sendToPlanner = (destinationName = "") => {
    if (!prefs) return;
    const draft = quizToPlannerForm(prefs, destinationName);
    savePlannerDraft({ form: draft, fromQuiz: true, destinationName });
    navigate("/planner");
  };

  if (!prefs) return null;

  const hasMatches = matches.length > 0;
  const top = matches[0];

  return (
    <div className="results-page">
      <div className="results-bg" aria-hidden="true">
        <div className="results-bg-blob results-bg-blob-a" />
        <div className="results-bg-blob results-bg-blob-b" />
      </div>

      <div className="results-shell">
        <header className="results-head">
          <span className="results-eyebrow">— Your matches</span>
          <h1>
            We found {matches.length} trip{matches.length === 1 ? "" : "s"} that
            fit you.
          </h1>
          <p>
            Ranked by how well each destination matches your vibe, budget, group,
            and activities. Refine any of them with the AI Planner — your answers
            are already loaded.
          </p>
          <div className="results-actions-top">
            <button
              type="button"
              className="btn-cta btn-cta-results-primary"
              onClick={() => sendToPlanner(top?.destination?.name || "")}
              disabled={!hasMatches}
            >
              Refine with AI Planner
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              className="btn-cta btn-cta-results-ghost"
              onClick={() => navigate("/quiz")}
            >
              Retake the quiz
            </button>
          </div>
        </header>

        {!hasMatches && (
          <div className="results-empty">
            We couldn't find a strong match. Try widening your region or budget.
          </div>
        )}

        <div className="results-grid">
          {matches.map((m, i) => {
            const d = m.destination;
            return (
              <article key={d.id} className="result-card">
                <div className="result-card-media">
                  <img
                    src={d.image}
                    alt={`${d.name}, ${d.country}`}
                    onError={handleImgError(d.fallback)}
                    loading={i < 2 ? "eager" : "lazy"}
                  />
                  <span className="result-card-rank">
                    #{String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="result-card-fit">{m.fit}</span>
                </div>
                <div className="result-card-body">
                  <div className="result-card-head">
                    <div>
                      <h3>{d.name}</h3>
                      <span className="result-card-country">{d.country}</span>
                    </div>
                    <div className="result-card-price">
                      <span>{d.nightsTypical}N from</span>
                      <strong>${d.priceFrom.toLocaleString()}</strong>
                    </div>
                  </div>
                  <p className="result-card-blurb">{d.blurb}</p>
                  <div className="result-card-why">
                    <span className="result-card-why-label">Why this fits</span>
                    <p>{m.why}</p>
                  </div>
                  <div className="result-card-tags">
                    {(d.tags.activities || []).slice(0, 4).map((t) => (
                      <span key={t} className="result-tag">{t}</span>
                    ))}
                  </div>
                  <div className="result-card-actions">
                    <button
                      type="button"
                      className="btn-cta btn-cta-result-primary"
                      onClick={() => sendToPlanner(d.name)}
                    >
                      Plan {d.name} with AI
                    </button>
                    <button
                      type="button"
                      className="btn-cta btn-cta-result-ghost"
                      onClick={() => navigate(`/packages?destination=${encodeURIComponent(d.name)}`)}
                    >
                      View Packages
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section className="results-footer-cta">
          <div>
            <h3>Want a human in the loop?</h3>
            <p>
              Talk to a real travel expert or refine these matches further with AI.
            </p>
          </div>
          <div className="results-footer-actions">
            <button
              type="button"
              className="btn-cta btn-cta-results-primary"
              onClick={() => sendToPlanner(top?.destination?.name || "")}
              disabled={!hasMatches}
            >
              Refine with AI Planner
            </button>
            <button
              type="button"
              className="btn-cta btn-cta-results-ghost"
              onClick={() => navigate("/packages")}
            >
              Talk to a Travel Expert
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
