import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { DESTINATIONS } from "../data/destinations";
import { savePlannerDraft, loadQuiz } from "../utils/preferences";
import { quizToPlannerForm } from "../utils/recommend";

const handleImgError = (fallback) => (e) => {
  if (e.target.src !== fallback) e.target.src = fallback;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString([], { month: "short", day: "numeric" }) : "";

const findDestination = (slug) => {
  if (!slug) return null;
  const s = slug.toLowerCase();
  return (
    DESTINATIONS.find((d) => d.id === s) ||
    DESTINATIONS.find((d) => d.name.toLowerCase() === s) ||
    null
  );
};

export default function Destination() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dest = useMemo(() => findDestination(slug), [slug]);

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dest) {
      setLoading(false);
      return;
    }
    let cancel = false;
    setLoading(true);
    api
      .get("/packages", { params: { search: dest.name, limit: 12 } })
      .then((res) => {
        if (cancel) return;
        const all = res.data?.packages || [];
        // Tighten to actual destination matches (the API does a contains
        // search across name + description, which is good enough as a
        // first pass).
        setPackages(all);
      })
      .catch(() => setPackages([]))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [dest]);

  const planWithAI = () => {
    const quiz = loadQuiz();
    const baseDraft = quiz
      ? quizToPlannerForm(quiz, dest.name)
      : { destination: dest.name };
    savePlannerDraft({ form: baseDraft, fromDestination: true });
    navigate("/planner");
  };

  if (!dest) {
    return (
      <div className="dest-detail">
        <div className="dest-detail-shell">
          <h1>Destination not found</h1>
          <p>We couldn't find that destination. Browse all packages instead.</p>
          <button
            type="button"
            className="btn-cta btn-cta-build-primary"
            onClick={() => navigate("/packages")}
          >
            View all packages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dest-detail">
      <header className="dest-detail-hero">
        <img
          src={dest.image}
          alt={`${dest.name}, ${dest.country}`}
          className="dest-detail-hero-img"
          onError={handleImgError(dest.fallback)}
        />
        <div className="dest-detail-hero-veil" aria-hidden="true" />
        <div className="dest-detail-hero-inner">
          <button
            type="button"
            className="dest-detail-back"
            onClick={() => navigate(-1)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="dest-detail-eyebrow">— Destination</span>
          <h1>{dest.name}</h1>
          <span className="dest-detail-country">{dest.country}</span>
          <p className="dest-detail-blurb">{dest.blurb}</p>
          <div className="dest-detail-meta">
            <div className="dest-detail-stat">
              <strong>{dest.nightsTypical}</strong>
              <span>typical nights</span>
            </div>
            <span className="dest-detail-divider" />
            <div className="dest-detail-stat">
              <strong>${dest.priceFrom.toLocaleString()}</strong>
              <span>from</span>
            </div>
            <span className="dest-detail-divider" />
            <div className="dest-detail-stat">
              <strong style={{ textTransform: "capitalize" }}>{dest.tags.climate}</strong>
              <span>climate</span>
            </div>
          </div>
          <div className="dest-detail-tags">
            {(dest.tags.activities || []).slice(0, 5).map((a) => (
              <span key={a} className="dest-detail-tag">{a}</span>
            ))}
          </div>
        </div>
      </header>

      <section className="dest-detail-shell">
        <div className="dest-detail-section-head">
          <div>
            <span className="section-eyebrow">— Packages</span>
            <h2>Trips to {dest.name}</h2>
          </div>
          <button
            type="button"
            className="btn-cta btn-cta-build-ghost"
            onClick={() => navigate(`/packages?search=${encodeURIComponent(dest.name)}`)}
          >
            Browse all
          </button>
        </div>

        {loading ? (
          <div className="packages-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="package-card package-card-skeleton" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="dest-detail-empty">
            <h3>No packages live for {dest.name} just yet.</h3>
            <p>
              Build a custom trip with our AI Planner — your preferences carry
              over and you can book the components separately.
            </p>
            <div className="dest-detail-empty-actions">
              <button
                type="button"
                className="btn-cta btn-cta-build-primary"
                onClick={planWithAI}
              >
                Plan {dest.name} with AI
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                className="btn-cta btn-cta-build-ghost"
                onClick={() => navigate("/build")}
              >
                Build manually
              </button>
            </div>
          </div>
        ) : (
          <div className="packages-grid dest-detail-packages">
            {packages.map((p, idx) => {
              const rawPrice = p.price ?? null;
              const parsedPrice =
                rawPrice !== null && rawPrice !== "" && Number.isFinite(Number(rawPrice))
                  ? Number(rawPrice)
                  : null;
              const hasValidPrice = parsedPrice !== null && parsedPrice > 0;
              const hasDiscount = hasValidPrice && Number(p.discount) > 0;
              const originalPrice = hasValidPrice ? parsedPrice : 0;
              const finalPrice = hasValidPrice
                ? originalPrice * (1 - Number(p.discount || 0) / 100)
                : 0;
              return (
                <article
                  key={p.id}
                  className={`package-card ${hasDiscount ? "package-card-deal" : ""}`}
                  onClick={() => navigate(`/book?type=package&id=${p.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      navigate(`/book?type=package&id=${p.id}`);
                  }}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="package-card-visual">
                    <img
                      src={dest.image}
                      alt={p.packageName}
                      className="package-card-img"
                      onError={handleImgError(dest.fallback)}
                      loading={idx < 2 ? "eager" : "lazy"}
                    />
                    <div className="package-card-img-overlay" />
                    {hasDiscount && (
                      <span className="package-badge">
                        {Number(p.discount)}% OFF
                      </span>
                    )}
                    {(p.startDate || p.endDate) && (
                      <div className="package-card-dates">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {fmtDate(p.startDate)}
                        {p.endDate ? ` — ${fmtDate(p.endDate)}` : ""}
                      </div>
                    )}
                  </div>
                  <div className="package-card-body">
                    <h3 className="package-card-name">{p.packageName}</h3>
                    {p.description && (
                      <p className="package-card-desc">{p.description}</p>
                    )}
                    <div className="package-card-footer">
                      <div className="package-card-price-block">
                        {hasValidPrice ? (
                          <>
                            {hasDiscount && (
                              <div className="package-card-original">
                                ${originalPrice.toFixed(0)}
                              </div>
                            )}
                            <div className="package-card-price">
                              ${finalPrice.toFixed(0)}
                            </div>
                            <div className="package-card-price-unit">/ person</div>
                          </>
                        ) : (
                          <>
                            <div className="package-card-price">Price on request</div>
                            <div className="package-card-price-unit">contact us</div>
                          </>
                        )}
                      </div>
                      <button
                        className="package-book-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/book?type=package&id=${p.id}`);
                        }}
                      >
                        View Trip
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && packages.length > 0 && (
          <div className="dest-detail-cta">
            <div>
              <h3>Want it tailored to you?</h3>
              <p>
                Refine any of these with the AI Planner — we'll fit it to your
                budget and dates.
              </p>
            </div>
            <div className="dest-detail-cta-actions">
              <button
                type="button"
                className="btn-cta btn-cta-results-primary"
                onClick={planWithAI}
              >
                Plan {dest.name} with AI
              </button>
              <button
                type="button"
                className="btn-cta btn-cta-results-ghost"
                onClick={() => navigate("/build")}
              >
                Build manually
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
