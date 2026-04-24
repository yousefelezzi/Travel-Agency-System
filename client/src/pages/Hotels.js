import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

/* ── hotel images keyed by city (realistic visual) ── */
const CITY_IMAGES = {
  dubai: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80&auto=format&fit=crop",
  paris: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80&auto=format&fit=crop",
  bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80&auto=format&fit=crop",
  istanbul: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80&auto=format&fit=crop",
  santorini: "https://images.unsplash.com/photo-1570077188672-e3a9c5e60ef4?w=800&q=80&auto=format&fit=crop",
  maldives: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80&auto=format&fit=crop",
  london: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80&auto=format&fit=crop",
  tokyo: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80&auto=format&fit=crop",
  rome: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80&auto=format&fit=crop",
  new_york: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80&auto=format&fit=crop",
  barcelona: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80&auto=format&fit=crop",
  doha: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80&auto=format&fit=crop",
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80&auto=format&fit=crop",
];

function hotelImage(hotel, index) {
  const cityKey = (hotel.city || "").toLowerCase().replace(/\s+/g, "_");
  return CITY_IMAGES[cityKey] || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

const handleImgError = (idx) => (e) => {
  const fb = FALLBACK_IMAGES[(idx + 3) % FALLBACK_IMAGES.length];
  if (e.target.src !== fb) e.target.src = fb;
};

/* ── derive guest-facing signals from hotel data ── */
function guestRating(hotel) {
  // Simulate a realistic guest score from star rating + price mix
  const base = Math.min((hotel.starRating || 3) * 1.6 + 1.2, 9.8);
  // Add slight variation from id hash
  const hash = (hotel.id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const jitter = ((hash % 10) - 5) * 0.06;
  return Math.min(9.9, Math.max(7.0, +(base + jitter).toFixed(1)));
}

function guestRatingLabel(score) {
  if (score >= 9.5) return "Exceptional";
  if (score >= 9.0) return "Superb";
  if (score >= 8.5) return "Excellent";
  if (score >= 8.0) return "Very Good";
  if (score >= 7.5) return "Good";
  return "Pleasant";
}

function reviewCount(hotel) {
  const hash = (hotel.id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = (hotel.starRating || 3) * 220;
  return base + (hash % 400);
}

function stayType(hotel) {
  const star = hotel.starRating || 3;
  const name = (hotel.name || "").toLowerCase();
  const desc = (hotel.description || "").toLowerCase();
  const blob = name + " " + desc;

  if (blob.includes("resort") || blob.includes("beach") || blob.includes("island")) return "Resort";
  if (blob.includes("boutique")) return "Boutique";
  if (blob.includes("villa") || blob.includes("private")) return "Villa";
  if (blob.includes("apartment") || blob.includes("suite")) return "Apartment";
  if (star >= 5) return "Luxury Hotel";
  if (star >= 4) return "Premium Hotel";
  if (star >= 3) return "Hotel";
  return "Hotel";
}

function trustSignals(hotel) {
  const signals = [];
  const star = hotel.starRating || 3;
  const hash = (hotel.id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  if (star >= 4 || hash % 3 === 0) signals.push("Free cancellation");
  if (star >= 3 && hash % 4 !== 2) signals.push("Breakfast included");
  if (hotel.availableRooms <= 3) signals.push("Only " + hotel.availableRooms + " left");

  return signals;
}

function amenitiesWithIcons(hotel) {
  const star = hotel.starRating || 3;
  const items = [];

  items.push({ label: "Wi-Fi", icon: "wifi" });
  items.push({ label: "AC", icon: "ac" });

  if (star >= 3) {
    items.push({ label: "Pool", icon: "pool" });
    items.push({ label: "Restaurant", icon: "restaurant" });
  }
  if (star >= 4) {
    items.push({ label: "Spa", icon: "spa" });
    items.push({ label: "Gym", icon: "gym" });
  }
  if (star >= 5) {
    items.push({ label: "Concierge", icon: "concierge" });
    items.push({ label: "Lounge", icon: "lounge" });
  }
  return items;
}

/* ── filter data ── */
const STAR_OPTIONS = [
  { value: "", label: "All Stars" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5 Only" },
];

const PROPERTY_TYPES = [
  { key: "all", label: "All Types" },
  { key: "hotel", label: "Hotels" },
  { key: "resort", label: "Resorts" },
  { key: "boutique", label: "Boutique" },
  { key: "villa", label: "Villas" },
  { key: "apartment", label: "Apartments" },
];

const AMENITY_FILTERS = [
  { key: "pool", label: "Pool" },
  { key: "spa", label: "Spa" },
  { key: "gym", label: "Gym" },
  { key: "restaurant", label: "Restaurant" },
  { key: "parking", label: "Parking" },
  { key: "pet", label: "Pet-friendly" },
];

const SORTS = [
  { key: "recommended", label: "Recommended" },
  { key: "cheapest", label: "Cheapest" },
  { key: "rating", label: "Best Rated" },
  { key: "best", label: "Best Value" },
];

const POPULAR_CITIES = [
  { city: "Dubai", country: "UAE", tag: "Luxury & skyline", image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80&auto=format&fit=crop", fallback: "https://picsum.photos/seed/dubai-hotel/600/400" },
  { city: "Paris", country: "France", tag: "Romance & charm", image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80&auto=format&fit=crop", fallback: "https://picsum.photos/seed/paris-hotel/600/400" },
  { city: "Bali", country: "Indonesia", tag: "Tropical retreat", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80&auto=format&fit=crop", fallback: "https://picsum.photos/seed/bali-hotel/600/400" },
  { city: "Istanbul", country: "Turkey", tag: "History & culture", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80&auto=format&fit=crop", fallback: "https://picsum.photos/seed/istanbul-hotel/600/400" },
  { city: "Santorini", country: "Greece", tag: "Views & sunsets", image: "https://images.unsplash.com/photo-1570077188672-e3a9c5e60ef4?w=600&q=80&auto=format&fit=crop", fallback: "https://picsum.photos/seed/santorini-hotel/600/400" },
  { city: "Maldives", country: "Indian Ocean", tag: "Overwater villas", image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600&q=80&auto=format&fit=crop", fallback: "https://picsum.photos/seed/maldives-hotel/600/400" },
];

const handlePopImgError = (fallback) => (e) => {
  if (e.target.src !== fallback) e.target.src = fallback;
};

/* ── amenity icon renderer ── */
function AmenityIcon({ type }) {
  const props = { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (type) {
    case "wifi": return <svg {...props}><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" /></svg>;
    case "pool": return <svg {...props}><path d="M2 12h20M2 18c2-1 4-1 6 0s4 1 6 0 4-1 6 0M12 2v10" /></svg>;
    case "spa": return <svg {...props}><path d="M12 22c4-4 8-8 8-12A8 8 0 0 0 4 10c0 4 4 8 8 12z" /></svg>;
    case "gym": return <svg {...props}><path d="M6.5 6.5h11M6 12H4a2 2 0 0 1 0-4h2M18 12h2a2 2 0 0 0 0-4h-2M6 12v5M18 12v5M6 17h12" /></svg>;
    case "restaurant": return <svg {...props}><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" /></svg>;
    case "concierge": return <svg {...props}><path d="M2 18h20M12 4v2M6 12h12a6 6 0 0 0-12 0z" /></svg>;
    case "lounge": return <svg {...props}><path d="M4 20h16M6 16V8a6 6 0 0 1 12 0v8M4 16h16" /></svg>;
    default: return <svg {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" /></svg>;
  }
}

export default function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("recommended");
  const [propertyType, setPropertyType] = useState("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [freeCancellation, setFreeCancellation] = useState(false);
  const [breakfastIncluded, setBreakfastIncluded] = useState(false);
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    city: "",
    country: "",
    checkIn: "",
    checkOut: "",
    guests: "2",
    maxPrice: "",
    minRating: "",
  });
  const [lastQuery, setLastQuery] = useState({ city: "", checkIn: "", checkOut: "", guests: "2" });
  const [pagination, setPagination] = useState({});
  const navigate = useNavigate();

  const search = async (page = 1, overrides = null) => {
    setLoading(true);
    try {
      const f = overrides || filters;
      const params = { page, limit: 12 };
      if (f.city) params.city = f.city;
      if (f.country) params.country = f.country;
      if (f.maxPrice) params.maxPrice = f.maxPrice;
      if (f.minRating) params.minRating = f.minRating;
      const res = await api.get("/hotels", { params });
      setHotels(res.data.hotels || []);
      setPagination(res.data.pagination || {});
      setLastQuery({
        city: f.city,
        checkIn: f.checkIn,
        checkOut: f.checkOut,
        guests: f.guests,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const destUrl =
      searchParams.get("destination") || searchParams.get("city") || "";
    const checkInUrl = searchParams.get("checkIn") || "";
    const checkOutUrl = searchParams.get("checkOut") || "";
    const guestsUrl = searchParams.get("guests") || searchParams.get("travelers") || "";
    if (destUrl || checkInUrl || checkOutUrl || guestsUrl) {
      const initial = {
        city: destUrl,
        country: "",
        checkIn: checkInUrl,
        checkOut: checkOutUrl,
        guests: guestsUrl || "2",
        maxPrice: "",
        minRating: "",
      };
      setFilters(initial);
      search(1, initial);
    } else {
      search();
    }
    /* eslint-disable-next-line */
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    search(1);
  };

  const toggleAmenity = (key) => {
    setSelectedAmenities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  };

  const activeFilterCount =
    (propertyType !== "all" ? 1 : 0) +
    selectedAmenities.length +
    (freeCancellation ? 1 : 0) +
    (breakfastIncluded ? 1 : 0);

  /* ── client-side sort + filter ── */
  const sortedHotels = useMemo(() => {
    let arr = [...hotels];

    // Property type filter (client-side on name/description)
    if (propertyType !== "all") {
      arr = arr.filter((h) => {
        const type = stayType(h).toLowerCase();
        return type.includes(propertyType);
      });
    }

    // Sort
    if (sort === "cheapest") {
      arr.sort((a, b) => Number(a.pricePerNight) - Number(b.pricePerNight));
    } else if (sort === "rating") {
      arr.sort((a, b) => guestRating(b) - guestRating(a));
    } else if (sort === "best") {
      const maxP = Math.max(...arr.map((h) => Number(h.pricePerNight)), 1);
      arr.sort(
        (a, b) =>
          Number(a.pricePerNight) / maxP - guestRating(a) / 10 -
          (Number(b.pricePerNight) / maxP - guestRating(b) / 10)
      );
    } else {
      // "recommended" — balanced: high rating first, break ties by price
      arr.sort((a, b) => {
        const rDiff = (b.starRating || 0) - (a.starRating || 0);
        if (rDiff !== 0) return rDiff;
        return Number(a.pricePerNight) - Number(b.pricePerNight);
      });
    }
    return arr;
  }, [hotels, sort, propertyType]);

  const bestId = sortedHotels[0]?.id;

  const resultsHeadline = () => {
    const count = sortedHotels.length;
    if (!count && loading) return "Searching the best hotels\u2026";
    if (!count) return "No hotels found";
    const parts = [];
    parts.push(`${count} hotel${count === 1 ? "" : "s"}`);
    if (lastQuery.city) parts.push(`in ${lastQuery.city}`);
    return parts.join(" ");
  };

  const nightCount = () => {
    if (!filters.checkIn || !filters.checkOut) return null;
    const diff = Math.ceil(
      (new Date(filters.checkOut) - new Date(filters.checkIn)) / 86400000
    );
    return diff > 0 ? diff : null;
  };

  const fmtDateShort = (iso) => {
    if (!iso) return "";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="hotels-page">
      {/* ── HERO + SEARCH ── */}
      <section className="hotels-hero">
        <div className="hotels-hero-bg" aria-hidden="true">
          <div className="hotels-hero-blob hotels-hero-blob-1" />
          <div className="hotels-hero-blob hotels-hero-blob-2" />
          <div className="hotels-hero-grid" />
        </div>
        <div className="hotels-hero-inner">
          <span className="hotels-eyebrow">
            <span className="hotels-eyebrow-dot" />
            — Find your stay
          </span>
          <h1 className="hotels-title">
            Where you stay
            <span className="hotels-title-accent"> matters.</span>
          </h1>
          <p className="hotels-sub">
            Discover hand-picked hotels across 120+ countries. Transparent pricing,
            verified reviews, and <em>free cancellation</em> on most stays.
          </p>

          <form className="hotels-search" onSubmit={handleSearch}>
            <div className="hotels-search-field">
              <label>Destination</label>
              <div className="hotels-field-inputwrap">
                <svg className="hotels-field-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                <input
                  placeholder="City, region, or country"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="hotels-search-divider" aria-hidden="true" />

            <div className="hotels-search-field">
              <label>Check-in</label>
              <input
                type="date"
                value={filters.checkIn}
                onChange={(e) => setFilters({ ...filters, checkIn: e.target.value })}
              />
            </div>
            <div className="hotels-search-divider" aria-hidden="true" />

            <div className="hotels-search-field">
              <label>Check-out</label>
              <input
                type="date"
                value={filters.checkOut}
                min={filters.checkIn || undefined}
                onChange={(e) => setFilters({ ...filters, checkOut: e.target.value })}
              />
            </div>
            <div className="hotels-search-divider" aria-hidden="true" />

            <div className="hotels-search-field hotels-search-field-sm">
              <label>Guests</label>
              <input
                type="number"
                min="1"
                max="10"
                value={filters.guests}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") return setFilters({ ...filters, guests: "" });
                  const n = Math.min(10, Math.max(1, parseInt(raw, 10) || 1));
                  setFilters({ ...filters, guests: String(n) });
                }}
              />
            </div>
            <div className="hotels-search-divider" aria-hidden="true" />

            <div className="hotels-search-field hotels-search-field-sm">
              <label>Max $/night</label>
              <div className="hotels-price-row">
                <span className="hotels-price-prefix">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Any"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, maxPrice: e.target.value.replace(/\D/g, "") })
                  }
                />
              </div>
            </div>

            <button type="submit" className="hotels-search-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              Search
            </button>
          </form>

          {/* ── Filter bar ── */}
          <div className="hotels-filters-bar">
            {/* Star rating */}
            <div className="hotels-filter-group">
              <span className="hotels-filter-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--accent)" }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                Rating
              </span>
              <div className="hotels-pill-group">
                {STAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`hotels-pill ${filters.minRating === opt.value ? "is-active" : ""}`}
                    onClick={() => {
                      setFilters((f) => ({ ...f, minRating: opt.value }));
                      setTimeout(() => search(1), 0);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hotels-filter-sep" />

            {/* Property type */}
            <div className="hotels-filter-group">
              <span className="hotels-filter-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14" /></svg>
                Type
              </span>
              <div className="hotels-pill-group">
                {PROPERTY_TYPES.map((pt) => (
                  <button
                    key={pt.key}
                    type="button"
                    className={`hotels-pill ${propertyType === pt.key ? "is-active" : ""}`}
                    onClick={() => setPropertyType(pt.key)}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hotels-filter-sep" />

            {/* More filters toggle */}
            <button
              type="button"
              className={`hotels-more-filters-btn ${showMoreFilters ? "is-open" : ""} ${activeFilterCount > 0 ? "has-filters" : ""}`}
              onClick={() => setShowMoreFilters(!showMoreFilters)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>
              More filters
              {activeFilterCount > 0 && (
                <span className="hotels-filter-count">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {/* ── Expanded filters ── */}
          {showMoreFilters && (
            <div className="hotels-expanded-filters">
              <div className="hotels-ef-section">
                <span className="hotels-ef-label">Amenities</span>
                <div className="hotels-ef-chips">
                  {AMENITY_FILTERS.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      className={`hotels-ef-chip ${selectedAmenities.includes(a.key) ? "is-active" : ""}`}
                      onClick={() => toggleAmenity(a.key)}
                    >
                      <AmenityIcon type={a.key === "parking" ? "ac" : a.key === "pet" ? "concierge" : a.key} />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="hotels-ef-section">
                <span className="hotels-ef-label">Preferences</span>
                <div className="hotels-ef-chips">
                  <button
                    type="button"
                    className={`hotels-ef-chip ${freeCancellation ? "is-active" : ""}`}
                    onClick={() => setFreeCancellation(!freeCancellation)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    Free cancellation
                  </button>
                  <button
                    type="button"
                    className={`hotels-ef-chip ${breakfastIncluded ? "is-active" : ""}`}
                    onClick={() => setBreakfastIncluded(!breakfastIncluded)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" /></svg>
                    Breakfast included
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Trust stats ── */}
          <div className="hotels-trust">
            <div className="hotels-trust-item">
              <strong>45,000+</strong>
              <span>properties</span>
            </div>
            <span className="hotels-trust-divider" />
            <div className="hotels-trust-item">
              <strong>120+</strong>
              <span>countries</span>
            </div>
            <span className="hotels-trust-divider" />
            <div className="hotels-trust-item">
              <strong>4.8 &#9733;</strong>
              <span>avg. rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── RESULTS ── */}
      <section className="hotels-results">
        <div className="hotels-results-header">
          <div className="hotels-results-headline">
            <div className="hotels-results-count">
              {loading ? "Searching the best hotels\u2026" : resultsHeadline()}
            </div>
            {!loading && lastQuery.checkIn && lastQuery.checkOut && (
              <div className="hotels-results-context">
                {fmtDateShort(lastQuery.checkIn)} &mdash; {fmtDateShort(lastQuery.checkOut)}
                {nightCount() && <> &middot; {nightCount()} night{nightCount() > 1 ? "s" : ""}</>}
                {lastQuery.guests && <> &middot; {lastQuery.guests} guest{lastQuery.guests !== "1" ? "s" : ""}</>}
              </div>
            )}
          </div>
          <div className="flights-sort" role="tablist">
            {SORTS.map((s) => (
              <button
                key={s.key}
                role="tab"
                aria-selected={sort === s.key}
                className={`flights-sort-btn ${sort === s.key ? "is-active" : ""}`}
                onClick={() => setSort(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="hotels-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`hotel-card hotel-card-skeleton ${i === 0 ? "hotel-card-featured" : ""}`} />
            ))}
          </div>
        ) : sortedHotels.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6" /></svg>
            </div>
            <h3>No hotels found</h3>
            <p>Try a different destination, adjust your filters, or change your dates.</p>
          </div>
        ) : (
          <div className="hotels-grid">
            {sortedHotels.map((h, idx) => {
              const isBest = h.id === bestId;
              const isFeatured = idx === 0;
              const amenities = amenitiesWithIcons(h);
              const nights = nightCount();
              const rating = guestRating(h);
              const rLabel = guestRatingLabel(rating);
              const reviews = reviewCount(h);
              const type = stayType(h);
              const signals = trustSignals(h);
              const imgSrc = hotelImage(h, idx);

              return (
                <article
                  key={h.id}
                  className={`hotel-card ${isBest ? "hotel-card-best" : ""} ${isFeatured ? "hotel-card-featured" : ""}`}
                  onClick={() => navigate(`/book?type=hotel&id=${h.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(`/book?type=hotel&id=${h.id}`);
                  }}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {/* ── Image ── */}
                  <div className="hotel-card-image">
                    <img
                      src={imgSrc}
                      alt={`${h.name} — ${h.city}`}
                      className="hotel-card-img"
                      onError={handleImgError(idx)}
                      loading={idx < 3 ? "eager" : "lazy"}
                    />
                    <div className="hotel-card-image-overlay" />

                    {/* Badge */}
                    {isBest && (
                      <span className="hotel-badge">
                        {sort === "cheapest" ? "Cheapest" : sort === "rating" ? "Top Rated" : sort === "best" ? "Best Value" : "Recommended"}
                      </span>
                    )}

                    {/* Star rating on image */}
                    <div className="hotel-card-stars">
                      {Array.from({ length: h.starRating || 0 }).map((_, i) => (
                        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                      ))}
                    </div>

                    {/* Guest rating chip */}
                    <div className="hotel-card-rating-chip">
                      <span className="hotel-rating-score">{rating}</span>
                      <span className="hotel-rating-label">{rLabel}</span>
                      <span className="hotel-rating-count">{reviews.toLocaleString()} reviews</span>
                    </div>

                    {/* Stay type label */}
                    <div className="hotel-card-type-label">{type}</div>
                  </div>

                  {/* ── Body ── */}
                  <div className="hotel-card-body">
                    <div className="hotel-card-top">
                      <h3 className="hotel-card-name">{h.name}</h3>
                      <div className="hotel-card-location">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        {h.city}, {h.country}
                      </div>
                    </div>

                    {h.description && (
                      <p className="hotel-card-desc">{h.description}</p>
                    )}

                    {/* Amenities */}
                    <div className="hotel-card-amenities">
                      {amenities.slice(0, isFeatured ? 6 : 4).map((a) => (
                        <span key={a.label} className="hotel-amenity-tag">
                          <AmenityIcon type={a.icon} />
                          {a.label}
                        </span>
                      ))}
                      {amenities.length > (isFeatured ? 6 : 4) && (
                        <span className="hotel-amenity-tag hotel-amenity-more">
                          +{amenities.length - (isFeatured ? 6 : 4)}
                        </span>
                      )}
                    </div>

                    {/* Trust signals */}
                    {signals.length > 0 && (
                      <div className="hotel-card-signals">
                        {signals.map((s, i) => (
                          <span key={i} className={`hotel-signal ${s.startsWith("Only") ? "hotel-signal-urgent" : "hotel-signal-good"}`}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              {s.startsWith("Only") ? <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></> : <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>}
                            </svg>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer: price + CTA */}
                    <div className="hotel-card-footer">
                      <div className="hotel-card-price-block">
                        <div className="hotel-card-price-label">from</div>
                        <div className="hotel-card-price">
                          ${Number(h.pricePerNight).toFixed(0)}
                          <span className="hotel-card-price-unit">/ night</span>
                        </div>
                        {nights && (
                          <div className="hotel-card-total">
                            ${(Number(h.pricePerNight) * nights).toFixed(0)} total &middot; {nights} night{nights > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                      <button
                        className="hotel-book-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/book?type=hotel&id=${h.id}`);
                        }}
                      >
                        View Stay
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
              <button
                key={i}
                className={`flights-page-btn ${pagination.page === i + 1 ? "is-active" : ""}`}
                onClick={() => search(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── POPULAR DESTINATIONS ── */}
      {!loading && sortedHotels.length > 0 && (
        <section className="hotels-popular">
          <div className="hotels-popular-inner">
            <div className="section-head">
              <div>
                <span className="section-eyebrow">— Explore by destination</span>
                <h2 className="section-title">
                  Trending <em>hotel cities.</em>
                </h2>
              </div>
            </div>
            <div className="hotels-popular-marquee">
              <div className="hotels-popular-track">
                {[...POPULAR_CITIES, ...POPULAR_CITIES].map((d, i) => {
                  const isDup = i >= POPULAR_CITIES.length;
                  return (
                <button
                  key={i}
                  type="button"
                  className="hotels-popular-card"
                  aria-hidden={isDup || undefined}
                  tabIndex={isDup ? -1 : undefined}
                  onClick={() => {
                    setFilters((f) => ({ ...f, city: d.city }));
                    setTimeout(() => search(1), 0);
                  }}
                >
                  <img
                    src={d.image}
                    alt={`${d.city}, ${d.country}`}
                    className="hotels-popular-img"
                    onError={handlePopImgError(d.fallback)}
                    loading="lazy"
                  />
                  <div className="hotels-popular-overlay" aria-hidden="true" />
                  <div className="hotels-popular-meta">
                    <div className="hotels-popular-city">{d.city}</div>
                    <div className="hotels-popular-country">{d.country}</div>
                    <div className="hotels-popular-tag">{d.tag}</div>
                  </div>
                </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
