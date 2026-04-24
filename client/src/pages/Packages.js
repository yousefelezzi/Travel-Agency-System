import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

/* ── hero images ── */
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=900&q=80&auto=format&fit=crop",
];

/* ── package card images keyed by keywords ── */
const PACKAGE_IMAGES = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=700&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=700&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=700&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=700&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1570077188672-e3a9c5e60ef4?w=700&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=700&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=700&q=80&auto=format&fit=crop",
];

const FALLBACK_IMG = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=700&q=80&auto=format&fit=crop";

function packageImage(pkg, idx) {
  return PACKAGE_IMAGES[idx % PACKAGE_IMAGES.length];
}

const handleImgError = (e) => {
  if (e.target.src !== FALLBACK_IMG) e.target.src = FALLBACK_IMG;
};

/* ── emotional cue based on package data ── */
function emotionalCue(pkg) {
  const name = (pkg.packageName || "").toLowerCase();
  const desc = (pkg.description || "").toLowerCase();
  const services = (pkg.services || []).join(" ").toLowerCase();
  const blob = name + " " + desc + " " + services;
  const hash = (pkg.id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  if (blob.includes("romantic") || blob.includes("honeymoon") || blob.includes("couple"))
    return { label: "Perfect for couples", color: "rose" };
  if (blob.includes("family") || blob.includes("kid") || blob.includes("child"))
    return { label: "Family-friendly", color: "teal" };
  if (blob.includes("luxury") || blob.includes("premium") || blob.includes("vip"))
    return { label: "Luxury experience", color: "amber" };
  if (blob.includes("adventure") || blob.includes("trek") || blob.includes("safari"))
    return { label: "Adventure awaits", color: "teal" };
  if (Number(pkg.discount) >= 15)
    return { label: "Limited-time deal", color: "green" };
  if (hash % 5 === 0)
    return { label: "Most booked this month", color: "teal" };
  if (hash % 4 === 0)
    return { label: "Top summer pick", color: "amber" };
  return null;
}

/* ── category chips ── */
const CATEGORIES = [
  { key: "all", label: "All Packages", icon: null },
  { key: "beach", label: "Beach & Island", icon: "🏖" },
  { key: "city", label: "City Break", icon: "🏙" },
  { key: "adventure", label: "Adventure", icon: "🏔" },
  { key: "luxury", label: "Luxury", icon: "✦" },
  { key: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { key: "romantic", label: "Romantic", icon: "💑" },
  { key: "cultural", label: "Cultural", icon: "🏛" },
];

const SORTS = [
  { key: "recommended", label: "Recommended" },
  { key: "cheapest", label: "Cheapest" },
  { key: "discount", label: "Biggest Savings" },
];

/* ── service icons ── */
const SERVICE_ICONS = {
  flight: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>,
  hotel: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6" /></svg>,
  transfer: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><path d="M5 17H3v-6l2-4h9l4 4h3v6h-2M5 17h10M9 7V4h4v3" /></svg>,
  meal: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" /></svg>,
  default: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>,
};

function serviceIcon(service) {
  const s = service.toLowerCase();
  if (s.includes("flight") || s.includes("air")) return SERVICE_ICONS.flight;
  if (s.includes("hotel") || s.includes("stay") || s.includes("resort") || s.includes("accommodation")) return SERVICE_ICONS.hotel;
  if (s.includes("transfer") || s.includes("transport") || s.includes("shuttle") || s.includes("car")) return SERVICE_ICONS.transfer;
  if (s.includes("meal") || s.includes("breakfast") || s.includes("dinner") || s.includes("food") || s.includes("dining")) return SERVICE_ICONS.meal;
  return SERVICE_ICONS.default;
}

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("recommended");
  const [category, setCategory] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [pagination, setPagination] = useState({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fetchPackages = async (page = 1, overrides = null) => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      const useSearch = overrides?.search ?? searchText;
      const useMax = overrides?.maxPrice ?? maxPrice;
      if (useSearch) params.search = useSearch;
      if (useMax) params.maxPrice = useMax;
      const res = await api.get("/packages", { params });
      setPackages(res.data.packages || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const destUrl =
      searchParams.get("destination") ||
      searchParams.get("search") ||
      "";
    if (destUrl) {
      setSearchText(destUrl);
      fetchPackages(1, { search: destUrl });
    } else {
      fetchPackages();
    }
    /* eslint-disable-next-line */
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPackages(1);
  };

  const filteredSorted = useMemo(() => {
    let arr = [...packages];
    if (category !== "all") {
      const key = category.toLowerCase();
      arr = arr.filter((p) => {
        const blob = [p.packageName || "", p.description || "", ...(p.services || [])].join(" ").toLowerCase();
        return blob.includes(key);
      });
    }
    if (sort === "cheapest") {
      arr.sort((a, b) => {
        const pa = Number(a.price) * (1 - Number(a.discount || 0) / 100);
        const pb = Number(b.price) * (1 - Number(b.discount || 0) / 100);
        return pa - pb;
      });
    } else if (sort === "discount") {
      arr.sort((a, b) => Number(b.discount || 0) - Number(a.discount || 0));
    }
    // "recommended" keeps server order
    return arr;
  }, [packages, category, sort]);

  const resultsHeadline = () => {
    const count = filteredSorted.length;
    if (!count) return "No packages available";
    return `${count} package${count === 1 ? "" : "s"} available`;
  };

  return (
    <div className="packages-page">
      {/* ── HERO — split layout ── */}
      <section className="packages-hero">
        <div className="packages-hero-bg" aria-hidden="true">
          <div className="packages-hero-blob packages-hero-blob-1" />
          <div className="packages-hero-blob packages-hero-blob-2" />
        </div>

        <div className="packages-hero-split">
          {/* Left: text + search */}
          <div className="packages-hero-content">
            <span className="packages-eyebrow">
              <span className="packages-eyebrow-dot" />
              — Curated packages
            </span>
            <h1 className="packages-title">
              Curated trips,
              <span className="packages-title-accent"> one price.</span>
            </h1>
            <p className="packages-sub">
              Flights, hotels, transfers, and experiences — bundled with
              <em> real savings</em>. Pick a theme, set your budget, go.
            </p>

            <form className="packages-search" onSubmit={handleSearch}>
              <div className="packages-search-field">
                <label>Search</label>
                <div className="packages-field-inputwrap">
                  <svg className="packages-field-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <input placeholder="Destination, theme, or keyword" value={searchText} onChange={(e) => setSearchText(e.target.value)} autoComplete="off" />
                </div>
              </div>
              <div className="packages-search-divider" aria-hidden="true" />
              <div className="packages-search-field packages-search-field-sm">
                <label>Max budget</label>
                <div className="packages-price-row">
                  <span className="packages-price-prefix">$</span>
                  <input type="text" inputMode="numeric" placeholder="Any" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>
              <button type="submit" className="packages-search-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                Search
              </button>
            </form>

            {/* Trust stats */}
            <div className="packages-trust">
              <div className="packages-trust-item">
                <strong>200+</strong>
                <span>curated trips</span>
              </div>
              <span className="packages-trust-divider" />
              <div className="packages-trust-item">
                <strong>30%</strong>
                <span>avg. savings</span>
              </div>
              <span className="packages-trust-divider" />
              <div className="packages-trust-item">
                <strong>4.9 &#9733;</strong>
                <span>traveler rating</span>
              </div>
            </div>
          </div>

          {/* Right: image collage */}
          <div className="packages-hero-visual" aria-hidden="true">
            <div className="packages-hero-img packages-hero-img-main">
              <img src={HERO_IMAGES[0]} alt="" onError={handleImgError} loading="eager" />
              <div className="packages-hero-img-overlay" />
            </div>
            <div className="packages-hero-img packages-hero-img-top">
              <img src={HERO_IMAGES[1]} alt="" onError={handleImgError} loading="eager" />
              <div className="packages-hero-img-overlay" />
            </div>
            <div className="packages-hero-img packages-hero-img-bottom">
              <img src={HERO_IMAGES[2]} alt="" onError={handleImgError} loading="eager" />
              <div className="packages-hero-img-overlay" />
            </div>
            {/* Floating info card */}
            <div className="packages-hero-float">
              <div className="packages-float-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></svg>
              </div>
              <div>
                <div className="packages-float-title">Save up to 30%</div>
                <div className="packages-float-sub">vs. booking separately</div>
              </div>
            </div>
          </div>
        </div>

        {/* Category chips — full width below split */}
        <div className="packages-categories">
          {CATEGORIES.map((c) => (
            <button key={c.key} type="button" className={`packages-cat-chip ${category === c.key ? "is-active" : ""}`} onClick={() => setCategory(c.key)}>
              {c.icon && <span className="packages-cat-icon">{c.icon}</span>}
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── RESULTS ── */}
      <section className="packages-results">
        <div className="packages-results-header">
          <div className="packages-results-count">
            {loading ? "Loading packages\u2026" : resultsHeadline()}
          </div>
          <div className="flights-sort" role="tablist">
            {SORTS.map((s) => (
              <button key={s.key} role="tab" aria-selected={sort === s.key} className={`flights-sort-btn ${sort === s.key ? "is-active" : ""}`} onClick={() => setSort(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="packages-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="package-card package-card-skeleton" />
            ))}
          </div>
        ) : filteredSorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            </div>
            <h3>No packages found</h3>
            <p>Try a different search term, category, or budget.</p>
          </div>
        ) : (
          <div className="packages-grid">
            {filteredSorted.map((p, idx) => {
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
              const savings = originalPrice - finalPrice;
              const cue = emotionalCue(p);
              const imgSrc = packageImage(p, idx);

              if (!hasValidPrice && process.env.NODE_ENV !== "production") {
                console.warn(
                  "[packages] Package missing or invalid price — rendering as Price on request",
                  { id: p.id, name: p.packageName, price: p.price }
                );
              }

              return (
                <article
                  key={p.id}
                  className={`package-card ${hasDiscount ? "package-card-deal" : ""}`}
                  onClick={() => navigate(`/book?type=package&id=${p.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/book?type=package&id=${p.id}`); }}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {/* ── Image header ── */}
                  <div className="package-card-visual">
                    <img src={imgSrc} alt={p.packageName} className="package-card-img" onError={handleImgError} loading={idx < 3 ? "eager" : "lazy"} />
                    <div className="package-card-img-overlay" />

                    {hasDiscount && (
                      <span className="package-badge">{Number(p.discount)}% OFF</span>
                    )}

                    {/* Emotional cue */}
                    {cue && (
                      <span className={`package-cue package-cue-${cue.color}`}>{cue.label}</span>
                    )}

                    {/* Date range */}
                    {(p.startDate || p.endDate) && (
                      <div className="package-card-dates">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        {fmtDate(p.startDate)}{p.endDate ? ` — ${fmtDate(p.endDate)}` : ""}
                      </div>
                    )}
                  </div>

                  <div className="package-card-body">
                    <h3 className="package-card-name">{p.packageName}</h3>

                    {p.description && (
                      <p className="package-card-desc">{p.description}</p>
                    )}

                    {p.services && p.services.length > 0 && (
                      <div className="package-card-services">
                        <div className="package-services-label">What's included</div>
                        <div className="package-services-list">
                          {p.services.map((s, i) => (
                            <div key={i} className="package-service-item">
                              <span className="package-service-icon">{serviceIcon(s)}</span>
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="package-card-footer">
                      <div className="package-card-price-block">
                        {hasValidPrice ? (
                          <>
                            {hasDiscount && (
                              <div className="package-card-original">${originalPrice.toFixed(0)}</div>
                            )}
                            <div className="package-card-price">${finalPrice.toFixed(0)}</div>
                            <div className="package-card-price-unit">/ person</div>
                            {hasDiscount && (
                              <div className="package-card-savings">You save ${savings.toFixed(0)}</div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="package-card-price">Price on request</div>
                            <div className="package-card-price-unit">contact us</div>
                          </>
                        )}
                      </div>
                      <button className="package-book-btn" onClick={(e) => { e.stopPropagation(); navigate(`/book?type=package&id=${p.id}`); }}>
                        View Trip
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && pagination.totalPages > 1 && (
          <div className="flights-pagination">
            {Array.from({ length: pagination.totalPages }, (_, i) => (
              <button key={i} className={`flights-page-btn ${pagination.page === i + 1 ? "is-active" : ""}`} onClick={() => fetchPackages(i + 1)}>{i + 1}</button>
            ))}
          </div>
        )}
      </section>

      {/* ── VALUE PROPOSITION ── */}
      {!loading && filteredSorted.length > 0 && (
        <section className="packages-value">
          <div className="packages-value-inner">
            <div className="section-head section-head-center">
              <span className="section-eyebrow">— Why book a package?</span>
              <h2 className="section-title">
                More trip, <em>less hassle.</em>
              </h2>
            </div>
            <div className="packages-value-grid">
              <div className="packages-value-card">
                <span className="packages-value-num">01</span>
                <div className="packages-value-icon packages-value-icon-teal">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v4M12 19v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M1 12h4M19 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                </div>
                <h4>Bundled savings</h4>
                <p>Packages cost less than booking each component separately. Real discounts, not fake markdowns.</p>
              </div>
              <div className="packages-value-card">
                <span className="packages-value-num">02</span>
                <div className="packages-value-icon packages-value-icon-amber">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" /><path d="m9 12 2 2 4-4" /></svg>
                </div>
                <h4>One booking, full coverage</h4>
                <p>Flights, stays, transfers, and activities — all confirmed in a single checkout with one invoice.</p>
              </div>
              <div className="packages-value-card">
                <span className="packages-value-num">03</span>
                <div className="packages-value-icon packages-value-icon-teal">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3v4zM3 19a2 2 0 0 0 2 2h1v-6H3v4z" /></svg>
                </div>
                <h4>Expert-curated</h4>
                <p>Every package is designed by travel agents who know the destination. Tested itineraries, trusted providers.</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
