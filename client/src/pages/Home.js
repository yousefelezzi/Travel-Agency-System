import { useState, useEffect } from "react";

const heroTrips = [
  {
    city: "Bali",
    country: "Indonesia",
    nights: 7,
    price: 1249,
    tag: "All-inclusive",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/bali-tropical/1200/800",
  },
  {
    city: "Maldives",
    country: "Indian Ocean",
    nights: 6,
    price: 2150,
    tag: "Overwater villa",
    image:
      "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/maldives-lagoon/1200/800",
  },
  {
    city: "Paris",
    country: "France",
    nights: 4,
    price: 879,
    tag: "City break",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/paris-eiffel/1200/800",
  },
  {
    city: "Dubai",
    country: "UAE",
    nights: 5,
    price: 1390,
    tag: "Luxury escape",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/dubai-skyline/1200/800",
  },
];

const destinations = [
  {
    city: "Santorini",
    country: "Greece",
    nights: 5,
    price: 489,
    image:
      "https://images.unsplash.com/photo-1570077188672-e3a9c5e60ef4?w=900&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/santorini-white/900/1200",
  },
  {
    city: "Kyoto",
    country: "Japan",
    nights: 7,
    price: 712,
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/kyoto-torii/900/1200",
  },
  {
    city: "Marrakech",
    country: "Morocco",
    nights: 4,
    price: 394,
    image:
      "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=900&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/marrakech-souk/900/1200",
  },
  {
    city: "Queenstown",
    country: "New Zealand",
    nights: 6,
    price: 1120,
    image:
      "https://images.unsplash.com/photo-1589871973318-9ca1258faa5d?w=900&q=80&auto=format&fit=crop",
    fallback: "https://picsum.photos/seed/queenstown-alps/900/1200",
  },
];

const tabs = [
  {
    id: "flights",
    label: "Flights",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </svg>
    ),
  },
  {
    id: "hotels",
    label: "Hotels",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6" />
      </svg>
    ),
  },
  {
    id: "packages",
    label: "Packages",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
];

const handleImgError = (fallback) => (e) => {
  if (e.target.src !== fallback) {
    e.target.src = fallback;
  }
};

export default function Home() {
  const [tripType, setTripType] = useState("flights");
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % heroTrips.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const currentTrip = heroTrips[slideIndex];

  return (
    <div className="home">
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-blob hero-blob-1" />
          <div className="hero-blob hero-blob-2" />
          <div className="hero-grid" />
        </div>

        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              Trusted by 2M+ travelers worldwide
            </span>
            <h1 className="hero-title">
              Your next journey,
              <br />
              <span className="hero-title-accent">beautifully planned.</span>
            </h1>
            <p className="hero-sub">
              Discover flights, hand-picked hotels, and curated packages in one
              seamless place. Real-time pricing, instant booking, zero noise.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn-cta btn-cta-primary">
                Start exploring
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button type="button" className="btn-cta btn-cta-ghost">
                How it works
              </button>
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
                <strong>4.9 &#9733;</strong>
                <span>user rating</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-card">
              <div className="hero-slides">
                {heroTrips.map((trip, i) => (
                  <img
                    key={trip.city}
                    className={`hero-slide ${i === slideIndex ? "active" : ""}`}
                    src={trip.image}
                    alt={`${trip.city}, ${trip.country}`}
                    onError={handleImgError(trip.fallback)}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                ))}
                <div className="hero-slide-overlay" />
                <div className="hero-slide-tag">
                  <span className="tag-dot" />
                  {currentTrip.tag}
                </div>
              </div>

              <div className="hero-card-meta">
                <div>
                  <div className="hero-card-city">
                    {currentTrip.city}, {currentTrip.country}
                  </div>
                  <div className="hero-card-sub">
                    {currentTrip.nights} nights &middot; {currentTrip.tag}
                  </div>
                </div>
                <div className="hero-card-price">
                  <span>from</span>
                  <strong>${currentTrip.price.toLocaleString()}</strong>
                </div>
              </div>

              <div className="hero-slide-dots">
                {heroTrips.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`slide-dot ${i === slideIndex ? "active" : ""}`}
                    onClick={() => setSlideIndex(i)}
                    aria-label={`Show trip ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="hero-float hero-float-1">
              <div className="float-icon float-icon-amber">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                </svg>
              </div>
              <div className="float-body">
                <div className="float-title">Direct flight</div>
                <div className="float-sub">12h 40m &middot; 1 stop</div>
              </div>
            </div>

            <div className="hero-float hero-float-2">
              <div className="float-icon float-icon-teal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div className="float-body">
                <div className="float-title">4.92 / 5.0</div>
                <div className="float-sub">12,840 reviews</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH WIDGET */}
      <section className="search-wrap">
        <div className="search-widget">
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
          <div className="search-fields">
            <div className="search-field">
              <label>From</label>
              <input type="text" placeholder="City or airport" defaultValue="Beirut (BEY)" />
            </div>
            <div className="sep" />
            <div className="search-field">
              <label>To</label>
              <input type="text" placeholder="Where to?" defaultValue="Paris (CDG)" />
            </div>
            <div className="sep" />
            <div className="search-field">
              <label>Depart</label>
              <input type="date" />
            </div>
            <div className="sep" />
            <div className="search-field">
              <label>Travelers</label>
              <input type="text" defaultValue="2 Adults" />
            </div>
            <button type="button" className="search-submit">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Search
            </button>
          </div>
        </div>
      </section>

      {/* DESTINATIONS */}
      <section className="section">
        <div className="section-head">
          <div>
            <span className="section-eyebrow">Featured destinations</span>
            <h2 className="section-title">Inspired picks for your next trip</h2>
          </div>
          <button type="button" className="section-link">
            View all
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="dest-grid">
          {destinations.map((d) => (
            <div key={d.city} className="dest-card">
              <img
                className="dest-img"
                src={d.image}
                alt={`${d.city}, ${d.country}`}
                onError={handleImgError(d.fallback)}
                loading="lazy"
              />
              <div className="dest-overlay" aria-hidden="true" />
              <div className="dest-top">
                <span className="dest-heart">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </span>
              </div>
              <div className="dest-meta">
                <div className="dest-name">{d.city}</div>
                <div className="dest-country">{d.country} &middot; {d.nights} nights</div>
              </div>
              <div className="dest-footer">
                <div className="dest-price">
                  <span>from</span>
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
          ))}
        </div>
      </section>

      {/* MID CTA — earlier conversion, low pressure */}
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
          <button type="button" className="btn-cta btn-cta-primary mid-cta-btn">
            Start planning your trip
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      {/* WHY TAS — bento: 1 featured + 2 side cards */}
      <section className="why-wrap">
        <div className="why-bg" aria-hidden="true">
          <div className="why-blob why-blob-1" />
          <div className="why-blob why-blob-2" />
        </div>
        <div className="why-inner">
          <div className="section-head section-head-center">
            <span className="section-eyebrow">Why TAS</span>
            <h2 className="section-title">Built for travelers. Designed to trust.</h2>
            <p className="section-sub">
              Three things we obsess over so you can focus on the trip, not the logistics.
            </p>
          </div>

          <div className="why-grid">
            {/* Featured dark card — spans 2 rows */}
            <article className="why-card why-featured">
              <div className="why-featured-bg" aria-hidden="true" />
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
                <h3>Real-time everywhere, no bait-and-switch.</h3>
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

            {/* Secure card */}
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

            {/* Human support card */}
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

      {/* FINAL CTA — reinforcement, not hard sell */}
      <section className="cta-wrap">
        <div className="cta-banner">
          <div className="cta-bg" aria-hidden="true" />
          <div className="cta-content">
            <span className="section-eyebrow eyebrow-light">Ready to start?</span>
            <h2>Your next adventure, one tap away.</h2>
            <p>
              Join 2M+ travelers planning smarter with TAS. Book with confidence,
              travel without the stress &mdash; we'll handle the rest.
            </p>
            <div className="cta-actions">
              <button type="button" className="btn-cta btn-cta-accent">Plan smarter with TAS</button>
              <button type="button" className="btn-cta btn-cta-ghost-light">Talk to an expert</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-mark">
              <span className="footer-mark-icon" />
              TAS
            </div>
            <p>Beautifully planned journeys, from search to boarding pass.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Company</h4>
              <span>About</span>
              <span>Careers</span>
              <span>Press</span>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <span>Flights</span>
              <span>Hotels</span>
              <span>Packages</span>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <span>Help center</span>
              <span>Contact</span>
              <span>Terms</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; 2026 TAS &middot; Crafted for travelers.
        </div>
      </footer>
    </div>
  );
}
