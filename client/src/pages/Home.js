import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import MiniChat from "../components/MiniChat";

const FAVORITES_KEY = "atlas_favorites";

const loadFavorites = () => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const saveFavorites = (list) => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
};

const heroTrips = [
  {
    city: "Bali",
    country: "Indonesia",
    nights: 7,
    price: 1249,
    tag: "All-inclusive",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/bali-tropical/1600/1000",
  },
  {
    city: "Maldives",
    country: "Indian Ocean",
    nights: 6,
    price: 2150,
    tag: "Overwater villa",
    image:
      "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1600&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/maldives-lagoon/1600/1000",
  },
  {
    city: "Paris",
    country: "France",
    nights: 4,
    price: 879,
    tag: "City break",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/paris-eiffel/1600/1000",
  },
  {
    city: "Dubai",
    country: "UAE",
    nights: 5,
    price: 1390,
    tag: "Luxury escape",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/dubai-skyline/1600/1000",
  },
];

const destinations = [
  {
    city: "Santorini",
    country: "Greece",
    nights: 5,
    price: 489,
    image:
      "https://images.unsplash.com/photo-1570077188672-e3a9c5e60ef4?w=1200&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/santorini-white/1200/1400",
  },
  {
    city: "Kyoto",
    country: "Japan",
    nights: 7,
    price: 712,
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/kyoto-torii/1200/800",
  },
  {
    city: "Marrakech",
    country: "Morocco",
    nights: 4,
    price: 394,
    image:
      "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=1200&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/marrakech-souk/1200/900",
  },
  {
    city: "Queenstown",
    country: "New Zealand",
    nights: 6,
    price: 1120,
    image:
      "https://images.unsplash.com/photo-1589871973318-9ca1258faa5d?w=1200&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/queenstown-alps/1200/900",
  },
];

const tabs = [
  {
    id: "flights",
    label: "Flights",
    submitLabel: "Search Flights",
    route: "/flights",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </svg>
    ),
  },
  {
    id: "hotels",
    label: "Hotels",
    submitLabel: "Search Hotels",
    route: "/hotels",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6" />
      </svg>
    ),
  },
  {
    id: "packages",
    label: "Packages",
    submitLabel: "Search Packages",
    route: "/packages",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    id: "planner",
    label: "AI Planner",
    submitLabel: "Plan with AI",
    route: "/planner",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

const TAB_BY_ID = Object.fromEntries(tabs.map((t) => [t.id, t]));

const buildSearchUrl = (mode, form) => {
  const params = new URLSearchParams();
  if (mode === "flights") {
    if (form.from) params.set("from", form.from);
    if (form.to) params.set("to", form.to);
    if (form.depart) params.set("depart", form.depart);
    if (form.tripClass === "roundtrip" && form.returnDate) params.set("return", form.returnDate);
    if (form.travelers) params.set("travelers", form.travelers);
    params.set("tripClass", form.tripClass || "roundtrip");
  } else if (mode === "hotels") {
    if (form.to) params.set("destination", form.to);
    if (form.depart) params.set("checkIn", form.depart);
    if (form.returnDate) params.set("checkOut", form.returnDate);
    if (form.travelers) params.set("guests", form.travelers);
  } else if (mode === "packages") {
    if (form.to) params.set("destination", form.to);
    if (form.depart) params.set("startDate", form.depart);
    if (form.returnDate) params.set("endDate", form.returnDate);
    if (form.travelers) params.set("travelers", form.travelers);
  } else if (mode === "planner") {
    if (form.to) params.set("destination", form.to);
    if (form.depart) params.set("startDate", form.depart);
    if (form.returnDate) params.set("endDate", form.returnDate);
    if (form.travelers) params.set("travelers", form.travelers);
  }
  const q = params.toString();
  return q ? `${TAB_BY_ID[mode].route}?${q}` : TAB_BY_ID[mode].route;
};

const handleImgError = (fallback) => (e) => {
  if (e.target.src !== fallback) {
    e.target.src = fallback;
  }
};

export default function Home() {
  const navigate = useNavigate();

  const [tripType, setTripType] = useState("flights");
  const [slideIndex, setSlideIndex] = useState(0);
  const [form, setForm] = useState({
    from: "",
    to: "",
    depart: "",
    returnDate: "",
    travelers: "2",
    tripClass: "roundtrip",
  });
  const [favorites, setFavorites] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const toggleFavorite = (city) => {
    setFavorites((prev) => {
      const next = prev.includes(city)
        ? prev.filter((c) => c !== city)
        : [...prev, city];
      saveFavorites(next);
      return next;
    });
  };

  const goToPackages = (city = "") => {
    navigate(city ? `/packages?destination=${encodeURIComponent(city)}` : "/packages");
  };

  const goToDestination = (city) => {
    if (!city) return;
    navigate(`/destination/${city.toLowerCase()}`);
  };

  const contactExpert = () => setChatOpen(true);

  useEffect(() => {
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % heroTrips.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const updateField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSearch = (e) => {
    e?.preventDefault();
    navigate(buildSearchUrl(tripType, form));
  };

  const currentTrip = heroTrips[slideIndex];
  const activeTab = TAB_BY_ID[tripType];

  return (
    <div className="home">
      {/* ========== HERO — Cinematic ========== */}
      <section className="hero">
        <div className="hero-stage" aria-hidden="true">
          {heroTrips.map((t, i) => (
            <img
              key={t.city}
              className={`hero-stage-img ${i === slideIndex ? "is-active" : ""}`}
              src={t.image}
              alt=""
              onError={handleImgError(t.fallback)}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
          <div className="hero-stage-tint" />
          <div className="hero-stage-aurora" />
          <div className="hero-stage-grain" />
        </div>

        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              Trusted by 2M+ travelers in 120+ countries
            </span>

            <h1 className="hero-title">
              <span className="hero-title-line hero-title-gradient">
                Your Trip. Your Way.
              </span>
            </h1>

            <p className="hero-sub">
              Discover flights, hand-picked hotels, and curated packages in one
              seamless place. Real-time pricing. Instant booking. Zero noise.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="btn-cta btn-cta-hero-primary"
                onClick={() => navigate("/build")}
              >
                Build My Trip
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                className="btn-cta btn-cta-hero-secondary"
                onClick={() => navigate("/planner")}
              >
                Plan with AI
              </button>
            </div>
          </div>

          <aside className="hero-chip">
            <div className="hero-chip-head">
              <span className="hero-chip-index">
                {String(slideIndex + 1).padStart(2, "0")}
                <em>/</em>
                {String(heroTrips.length).padStart(2, "0")}
              </span>
              <span className="hero-chip-tag">
                <span className="tag-dot" />
                {currentTrip.tag}
              </span>
            </div>
            <div className="hero-chip-city">{currentTrip.city}</div>
            <div className="hero-chip-country">{currentTrip.country}</div>
            <div className="hero-chip-foot">
              <div className="hero-chip-price">
                <span>{currentTrip.nights} nights from</span>
                <strong>${currentTrip.price.toLocaleString()}</strong>
              </div>
              <div className="hero-chip-dots">
                {heroTrips.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`chip-dot ${i === slideIndex ? "is-active" : ""}`}
                    onClick={() => setSlideIndex(i)}
                    aria-label={`Show trip ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="hero-trust">
          <div className="trust-item">
            <strong>120+</strong>
            <span>countries</span>
          </div>
          <span className="trust-divider" />
          <div className="trust-item">
            <strong>850+</strong>
            <span>airlines</span>
          </div>
          <span className="trust-divider" />
          <div className="trust-item">
            <strong>4.92 &#9733;</strong>
            <span>12,840 reviews</span>
          </div>
        </div>
      </section>

      {/* ========== SEARCH WIDGET ========== */}
      <section className="search-wrap" id="search">
        <form className="search-widget" onSubmit={handleSearch}>
          <div className="search-prompt">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
            Where do you dream of going?
          </div>
          <div className="search-tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`search-tab ${tripType === t.id ? "active" : ""}`}
                onClick={() => setTripType(t.id)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {tripType === "flights" && (
            <div className="search-trip-class" role="radiogroup" aria-label="Trip type">
              {[
                { id: "roundtrip", label: "Round-trip" },
                { id: "oneway", label: "One-way" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`trip-class-opt ${form.tripClass === opt.id ? "is-active" : ""}`}
                >
                  <input
                    type="radio"
                    name="tripClass"
                    value={opt.id}
                    checked={form.tripClass === opt.id}
                    onChange={updateField("tripClass")}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}

          <div className="search-fields">
            {tripType === "flights" && (
              <>
                <div className="search-field">
                  <label>From</label>
                  <input
                    type="text"
                    placeholder="City or airport"
                    value={form.from}
                    onChange={updateField("from")}
                  />
                </div>
                <div className="sep" />
              </>
            )}

            <div className="search-field">
              <label>
                {tripType === "flights"
                  ? "To"
                  : tripType === "hotels"
                  ? "Destination"
                  : tripType === "packages"
                  ? "Destination"
                  : "Where to"}
              </label>
              <input
                type="text"
                placeholder={
                  tripType === "flights" ? "Where to?" : "City, country, or region"
                }
                value={form.to}
                onChange={updateField("to")}
              />
            </div>
            <div className="sep" />

            <div className="search-field">
              <label>
                {tripType === "flights"
                  ? "Depart"
                  : tripType === "hotels"
                  ? "Check-in"
                  : "Start date"}
              </label>
              <input type="date" value={form.depart} onChange={updateField("depart")} />
            </div>

            {(tripType !== "flights" || form.tripClass === "roundtrip") && (
              <>
                <div className="sep" />
                <div className="search-field">
                  <label>
                    {tripType === "flights"
                      ? "Return"
                      : tripType === "hotels"
                      ? "Check-out"
                      : "End date"}
                  </label>
                  <input
                    type="date"
                    value={form.returnDate}
                    onChange={updateField("returnDate")}
                  />
                </div>
              </>
            )}

            <div className="sep" />
            <div className="search-field">
              <label>{tripType === "hotels" ? "Guests" : "Travelers"}</label>
              <select value={form.travelers} onChange={updateField("travelers")}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "person" : "people"}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="search-submit">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              {activeTab.submitLabel}
            </button>
          </div>
        </form>
      </section>

      {/* ========== TRAVEL QUIZ ========== */}
      <section className="quiz-promo-wrap">
        <div className="quiz-promo">
          <div className="quiz-promo-media">
            <img
              src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1400&q=80&auto=format&fit=crop"
              alt=""
              onError={handleImgError("https://picsum.photos/seed/quiz-passport/1400/900")}
              loading="lazy"
            />
            <div className="quiz-promo-veil" aria-hidden="true" />
          </div>
          <div className="quiz-promo-body">
            <span className="quiz-promo-eyebrow">
              <span className="quiz-promo-dot" />
              Travel concierge
            </span>
            <h2 className="quiz-promo-title">Not sure where to go?</h2>
            <p className="quiz-promo-sub">
              Answer a few quick questions and we'll match you with trips that fit
              your style, budget, and travel mood.
            </p>
            <div className="quiz-promo-meta">
              <div className="quiz-promo-stat">
                <strong>7</strong>
                <span>quick questions</span>
              </div>
              <span className="quiz-promo-divider" />
              <div className="quiz-promo-stat">
                <strong>~90s</strong>
                <span>to finish</span>
              </div>
              <span className="quiz-promo-divider" />
              <div className="quiz-promo-stat">
                <strong>5</strong>
                <span>tailored matches</span>
              </div>
            </div>
            <button
              type="button"
              className="btn-cta btn-cta-quiz"
              onClick={() => navigate("/quiz")}
            >
              Take the Travel Quiz
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ========== MARQUEE ========== */}
      <section className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="marquee-group">
              <span>Flights</span>
              <span className="marquee-dot">&#10038;</span>
              <span>1.2M hotels</span>
              <span className="marquee-dot">&#10038;</span>
              <span>120+ countries</span>
              <span className="marquee-dot">&#10038;</span>
              <span>AI itineraries</span>
              <span className="marquee-dot">&#10038;</span>
              <span>Instant confirmation</span>
              <span className="marquee-dot">&#10038;</span>
              <span>Refundable plans</span>
              <span className="marquee-dot">&#10038;</span>
              <span>24/7 concierge</span>
              <span className="marquee-dot">&#10038;</span>
              <span>Curated packages</span>
              <span className="marquee-dot">&#10038;</span>
            </div>
          ))}
        </div>
      </section>

      {/* ========== DESTINATIONS BENTO ========== */}
      <section className="section dest-section">
        <div className="section-head">
          <div>
            <span className="section-eyebrow">— Featured destinations</span>
            <h2 className="section-title">
              Hand-picked escapes,
              <br />
              <em>curated by humans.</em>
            </h2>
          </div>
          <button
            type="button"
            className="section-link"
            onClick={() => goToPackages()}
          >
            View all 120+
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="dest-bento">
          {destinations.map((d, i) => {
            const isSaved = favorites.includes(d.city);
            return (
              <article
                key={d.city}
                className={`dest-card dest-card-${i + 1}`}
                onClick={() => goToDestination(d.city)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToDestination(d.city);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Explore ${d.city}`}
              >
                <img
                  className="dest-img"
                  src={d.image}
                  alt={`${d.city}, ${d.country}`}
                  onError={handleImgError(d.fallback)}
                  loading="lazy"
                />
                <div className="dest-veil" aria-hidden="true" />
                <span className="dest-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  className={`dest-heart ${isSaved ? "is-saved" : ""}`}
                  aria-label={`${isSaved ? "Unsave" : "Save"} ${d.city}`}
                  aria-pressed={isSaved}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(d.city);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
                <div className="dest-body">
                  <div className="dest-head">
                    <h3>{d.city}</h3>
                    <span className="dest-country">{d.country}</span>
                  </div>
                  <div className="dest-foot">
                    <div className="dest-price">
                      <span>{d.nights}N from</span>
                      <strong>${d.price}</strong>
                    </div>
                    <span className="dest-cta">
                      Explore
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ========== MID CTA — dark ribbon ========== */}
      <section className="mid-cta-wrap">
        <div className="mid-cta">
          <div className="mid-cta-glow" aria-hidden="true" />
          <div className="mid-cta-left">
            <div className="mid-cta-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <div className="mid-cta-title">Save your favorite trips</div>
              <div className="mid-cta-sub">
                Create a free account in 30 seconds &mdash; come back to your picks anytime and unlock member-only rates.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-cta btn-cta-accent mid-cta-btn"
            onClick={() => navigate("/build")}
          >
            Start planning your trip
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      {/* ========== WHY ATLAS — Bento ========== */}
      <section className="why-wrap">
        <div className="why-bg" aria-hidden="true">
          <div className="why-blob why-blob-1" />
          <div className="why-blob why-blob-2" />
        </div>
        <div className="why-inner">
          <div className="section-head section-head-center">
            <span className="section-eyebrow">— Why ATLAS</span>
            <h2 className="section-title">
              Built for travelers.
              <br />
              <em>Designed to trust.</em>
            </h2>
            <p className="section-sub">
              Three things we obsess over so you can focus on the trip, not the logistics.
            </p>
          </div>

          <div className="why-grid">
            <article className="why-card why-featured">
              <div className="why-featured-bg" aria-hidden="true" />
              <div className="why-featured-grain" aria-hidden="true" />
              <div className="why-featured-top">
                <div className="why-featured-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                    <path d="M11 8v3l2 2" />
                  </svg>
                </div>
                <span className="why-pill">
                  <span className="why-pill-dot" />
                  Live pricing
                </span>
              </div>
              <div className="why-featured-body">
                <h3>
                  Real-time everywhere,
                  <br />
                  <em>no bait-and-switch.</em>
                </h3>
                <p>
                  Live availability across 850+ airlines and over a million hotels.
                  What you see is exactly what you book &mdash; prices refresh under
                  a second, and every quote is honored at checkout.
                </p>
              </div>
              <div className="why-stats">
                <div className="why-stat">
                  <strong>850+</strong>
                  <span>airlines</span>
                </div>
                <div className="why-stat">
                  <strong>1.2M</strong>
                  <span>hotels</span>
                </div>
                <div className="why-stat">
                  <strong>&lt;1s</strong>
                  <span>price refresh</span>
                </div>
              </div>
            </article>

            <article className="why-card why-side">
              <div className="why-icon-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3>Secure &amp; flexible</h3>
              <p>
                PCI-compliant checkout, instant confirmation, and refundable plans
                on most bookings &mdash; change your mind without losing sleep.
              </p>
            </article>

            <article className="why-card why-side">
              <div className="why-icon-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3v4zM3 19a2 2 0 0 0 2 2h1v-6H3v4z" />
                </svg>
              </div>
              <h3>Human support, 24/7</h3>
              <p>
                Reach a real person in any timezone. Flight changes, refunds and
                in-trip emergencies are handled in minutes, not queues.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="cta-wrap">
        <div className="cta-banner">
          <div className="cta-bg" aria-hidden="true" />
          <div className="cta-grain" aria-hidden="true" />
          <div className="cta-content">
            <span className="section-eyebrow eyebrow-light">— Ready to start?</span>
            <h2>
              Your next adventure,
              <br />
              <em>one tap away.</em>
            </h2>
            <p>
              Join 2M+ travelers planning smarter with ATLAS. Book with confidence,
              travel without the stress &mdash; we'll handle the rest.
            </p>
            <div className="cta-actions">
              <button
                type="button"
                className="btn-cta btn-cta-accent"
                onClick={() => navigate("/build")}
              >
                Plan smarter with ATLAS
              </button>
              <button
                type="button"
                className="btn-cta btn-cta-ghost-light"
                onClick={contactExpert}
              >
                Talk to an expert
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-mark">
              <span className="footer-mark-icon" />
              ATLAS
            </div>
            <p>Your Trip. Your Way.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Company</h4>
              <Link to="/build">Build a trip</Link>
              <Link to="/quiz">Travel quiz</Link>
              <Link to="/planner">AI planner</Link>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <Link to="/flights">Flights</Link>
              <Link to="/hotels">Hotels</Link>
              <Link to="/packages">Packages</Link>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <a href="mailto:concierge@atlas.com">Contact</a>
              <a href="mailto:concierge@atlas.com?subject=Help">Help center</a>
              <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; 2026 ATLAS &middot; Crafted for travelers.
        </div>
      </footer>

      <MiniChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
