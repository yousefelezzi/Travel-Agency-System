import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

// Map airport code -> country. Used to enrich the API's raw "City (CODE)" strings.
const COUNTRY_BY_CODE = {
  BEY: "Lebanon", DXB: "UAE", AUH: "UAE", IST: "Turkey", SAW: "Turkey",
  LHR: "United Kingdom", STN: "United Kingdom", CDG: "France", FRA: "Germany",
  DOH: "Qatar", JFK: "United States", ATL: "United States", NRT: "Japan",
  HND: "Japan", FCO: "Italy", CAI: "Egypt", BKK: "Thailand", SIN: "Singapore",
  HKG: "Hong Kong", YYZ: "Canada", AMS: "Netherlands", MAD: "Spain",
  ATH: "Greece", JTR: "Greece", VIE: "Austria", RUH: "Saudi Arabia",
  JED: "Saudi Arabia", SYD: "Australia",
};

const POPULAR_CODES = ["BEY", "DXB", "IST", "CDG", "LHR", "JFK"];
const RECENT_KEY = "tas-recent-airports";

function parseAirport(str) {
  const m = str.match(/^(.*?)\s*\(([A-Z]{3})\)\s*$/);
  if (!m) return { raw: str, city: str, code: "", country: "" };
  const city = m[1];
  const code = m[2];
  return { raw: str, city, code, country: COUNTRY_BY_CODE[code] || "" };
}

function highlightMatch(text, q) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="flights-combo-mark">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function AirportCombo({ label, placeholder, value, onChange, options, onCommit, inputRef }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [recent, setRecent] = useState([]);
  const wrapRef = useRef(null);
  const localRef = useRef(null);
  const realRef = inputRef || localRef;

  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      setRecent(Array.isArray(r) ? r : []);
    } catch {}
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const parsedAll = useMemo(() => options.map(parseAirport), [options]);
  const q = (value || "").trim();

  const { list, mode } = useMemo(() => {
    if (!q) {
      const recentItems = recent
        .map((r) => parsedAll.find((p) => p.raw === r))
        .filter(Boolean)
        .slice(0, 4);
      const popular = POPULAR_CODES
        .map((c) => parsedAll.find((p) => p.code === c))
        .filter(Boolean)
        .filter((p) => !recentItems.some((r) => r.raw === p.raw))
        .slice(0, 6);
      return {
        list: [
          ...(recentItems.length ? [{ header: "Recent searches", items: recentItems }] : []),
          ...(popular.length ? [{ header: "Popular destinations", items: popular }] : []),
        ],
        mode: "suggest",
      };
    }
    const ql = q.toLowerCase();
    const filtered = parsedAll
      .filter(
        (p) =>
          p.city.toLowerCase().includes(ql) ||
          p.code.toLowerCase().includes(ql) ||
          p.country.toLowerCase().includes(ql)
      )
      .slice(0, 60);
    return { list: filtered.length ? [{ header: null, items: filtered }] : [], mode: "search" };
  }, [q, parsedAll, recent]);

  const flatItems = useMemo(() => list.flatMap((g) => g.items), [list]);

  const pick = (item) => {
    onChange(item.raw);
    setOpen(false);
    try {
      const next = [item.raw, ...recent.filter((r) => r !== item.raw)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      setRecent(next);
    } catch {}
    if (onCommit) onCommit(item.raw);
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(flatItems.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && open && flatItems[highlight]) {
      e.preventDefault();
      pick(flatItems[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  let renderIdx = -1;

  return (
    <div
      className={`flights-search-field flights-combo ${open ? "is-open" : ""}`}
      ref={wrapRef}
    >
      <label>{label}</label>
      <div className="flights-combo-inputwrap">
        <svg className="flights-combo-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <input
          ref={realRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          autoComplete="off"
          spellCheck={false}
        />
        {value && (
          <button
            type="button"
            className="flights-combo-clear"
            aria-label="Clear"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange("");
              realRef.current?.focus();
              setOpen(true);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="flights-combo-panel" role="listbox">
          {mode === "search" && flatItems.length === 0 ? (
            <div className="flights-combo-empty">
              <div className="flights-combo-empty-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </div>
              <div className="flights-combo-empty-title">No matches for "{q}"</div>
              <div className="flights-combo-empty-sub">Try a city name or 3-letter airport code.</div>
            </div>
          ) : (
            list.map((group, gi) => (
              <div key={gi} className="flights-combo-group">
                {group.header && (
                  <div className="flights-combo-group-head">{group.header}</div>
                )}
                <ul>
                  {group.items.map((item) => {
                    renderIdx += 1;
                    const idx = renderIdx;
                    return (
                      <li
                        key={item.raw}
                        role="option"
                        aria-selected={idx === highlight}
                        className={`flights-combo-item ${idx === highlight ? "is-hi" : ""}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pick(item);
                        }}
                        onMouseEnter={() => setHighlight(idx)}
                      >
                        <div className="flights-combo-pin">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        </div>
                        <div className="flights-combo-text">
                          <div className="flights-combo-city">
                            {highlightMatch(item.city, q)}
                            {item.country && (
                              <span className="flights-combo-country">
                                , {highlightMatch(item.country, q)}
                              </span>
                            )}
                          </div>
                          <div className="flights-combo-airport">
                            {item.code ? `${item.code} · ` : ""}Airport
                          </div>
                        </div>
                        {item.code && (
                          <span className="flights-combo-code">
                            {highlightMatch(item.code, q)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const SORTS = [
  { key: "cheapest", label: "Cheapest" },
  { key: "fastest", label: "Fastest" },
  { key: "best", label: "Best Value" },
];

export default function Flights() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("cheapest");
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    date: "",
    maxPrice: "",
    passengers: "1",
  });
  const [lastQuery, setLastQuery] = useState({ from: "", to: "" });
  const [pagination, setPagination] = useState({});
  const [airports, setAirports] = useState([]);
  const toRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/flights/airports")
      .then((res) => setAirports(res.data.airports || []))
      .catch(() => {});
  }, []);

  const search = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.date) params.date = filters.date;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.passengers) params.passengers = filters.passengers;

      const res = await api.get("/flights", { params });
      setFlights(res.data.flights);
      setPagination(res.data.pagination);
      setLastQuery({ from: filters.from, to: filters.to });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    search(1);
  };

  const durationMin = (f) =>
    Math.max(1, (new Date(f.arrivalDate) - new Date(f.departureDate)) / 60000);

  const fmtDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  const fmtTime = (d) =>
    new Date(d).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const fmtDay = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const sortedFlights = useMemo(() => {
    const arr = [...flights];
    if (sort === "cheapest") {
      arr.sort((a, b) => Number(a.economyPrice) - Number(b.economyPrice));
    } else if (sort === "fastest") {
      arr.sort((a, b) => durationMin(a) - durationMin(b));
    } else {
      const maxP = Math.max(...arr.map((f) => Number(f.economyPrice)), 1);
      const maxD = Math.max(...arr.map(durationMin), 1);
      arr.sort(
        (a, b) =>
          Number(a.economyPrice) / maxP +
          durationMin(a) / maxD -
          (Number(b.economyPrice) / maxP + durationMin(b) / maxD)
      );
    }
    return arr;
  }, [flights, sort]);

  const bestId = sortedFlights[0]?.id;
  const bestLabel =
    sort === "cheapest" ? "Cheapest" : sort === "fastest" ? "Fastest" : "Best Value";

  const resultsHeadline = () => {
    const count = flights.length;
    const { from, to } = lastQuery;
    if (!count) return "No flights yet";
    if (from && to) return `${count} flight${count === 1 ? "" : "s"} found from ${from} to ${to}`;
    if (from) return `${count} flight${count === 1 ? "" : "s"} found from ${from}`;
    if (to) return `${count} flight${count === 1 ? "" : "s"} found to ${to}`;
    return `${count} flight${count === 1 ? "" : "s"} available`;
  };

  return (
    <div className="flights-page">
      <section className="flights-hero">
        <div className="flights-hero-bg" aria-hidden="true">
          <div className="flights-hero-blob flights-hero-blob-1" />
          <div className="flights-hero-blob flights-hero-blob-2" />
        </div>
        <div className="flights-hero-inner">
          <span className="flights-eyebrow">Flights</span>
          <h1 className="flights-title">
            Where do you want to <span className="flights-title-accent">go?</span>
          </h1>
          <p className="flights-sub">
            Compare thousands of routes and find the one that fits your trip — and your budget.
          </p>

          <form className="flights-search" onSubmit={handleSearch}>
            <AirportCombo
              label="From"
              placeholder="City or airport"
              value={filters.from}
              onChange={(v) => setFilters((f) => ({ ...f, from: v }))}
              onCommit={() => setTimeout(() => toRef.current?.focus(), 60)}
              options={airports}
            />
            <div className="flights-search-divider" aria-hidden="true" />
            <AirportCombo
              label="To"
              placeholder="City or airport"
              value={filters.to}
              onChange={(v) => setFilters((f) => ({ ...f, to: v }))}
              options={airports}
              inputRef={toRef}
            />
            <div className="flights-search-divider" aria-hidden="true" />
            <div className="flights-search-field">
              <label>Departure</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
            <div className="flights-search-divider" aria-hidden="true" />
            <div className="flights-search-field flights-search-field-sm">
              <label>Passengers</label>
              <input
                type="number"
                min="1"
                max="9"
                value={filters.passengers}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") return setFilters({ ...filters, passengers: "" });
                  const n = Math.min(9, Math.max(1, parseInt(raw, 10) || 1));
                  setFilters({ ...filters, passengers: String(n) });
                }}
              />
            </div>
            <div className="flights-search-divider" aria-hidden="true" />
            <div className="flights-search-field flights-search-field-sm flights-search-field-price">
              <label>Max price</label>
              <div className="flights-price-row">
                <span className="flights-price-prefix">$</span>
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
            <button type="submit" className="flights-search-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="flights-results">
        <div className="flights-results-header">
          <div className="flights-results-count">
            {loading ? "Searching best routes…" : resultsHeadline()}
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
          <div className="flight-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flight-card flight-card-skeleton" />
            ))}
          </div>
        ) : sortedFlights.length === 0 ? (
          <div className="empty-state">
            <h3>No flights found</h3>
            <p>Try different dates or destinations.</p>
          </div>
        ) : (
          <div className="flight-list">
            {sortedFlights.map((f) => {
              const mins = durationMin(f);
              const isBest = f.id === bestId;
              return (
                <article
                  key={f.id}
                  className={`flight-card ${isBest ? "flight-card-best" : ""}`}
                  onClick={() => navigate(`/book?type=flight&id=${f.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(`/book?type=flight&id=${f.id}`);
                  }}
                >
                  {isBest && <span className="flight-badge">{bestLabel}</span>}
                  <div className="flight-card-main">
                    <div className="flight-airline">
                      <div className="flight-airline-mark" aria-hidden="true">
                        {f.airlineName?.slice(0, 2).toUpperCase() || "FL"}
                      </div>
                      <div>
                        <div className="flight-airline-name">{f.airlineName}</div>
                        <div className="flight-airline-meta">{f.flightNumber}</div>
                      </div>
                    </div>

                    <div className="flight-route">
                      <div className="flight-endpoint">
                        <div className="flight-time">{fmtTime(f.departureDate)}</div>
                        <div className="flight-port">{f.departurePort}</div>
                        <div className="flight-day">{fmtDay(f.departureDate)}</div>
                      </div>

                      <div className="flight-path" aria-hidden="true">
                        <div className="flight-path-duration">{fmtDuration(mins)}</div>
                        <div className="flight-path-line">
                          <span className="flight-path-dot" />
                          <span className="flight-path-track" />
                          <svg className="flight-path-plane" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
                          </svg>
                          <span className="flight-path-dot" />
                        </div>
                        <div className="flight-path-stops">Nonstop</div>
                      </div>

                      <div className="flight-endpoint flight-endpoint-end">
                        <div className="flight-time">{fmtTime(f.arrivalDate)}</div>
                        <div className="flight-port">{f.arrivalPort}</div>
                        <div className="flight-day">{fmtDay(f.arrivalDate)}</div>
                      </div>
                    </div>

                    <div className="flight-price-block">
                      <div className="flight-price-label">from</div>
                      <div className="flight-price">${Number(f.economyPrice).toFixed(0)}</div>
                      <div className="flight-price-unit">per passenger</div>
                      <button
                        className="flight-book-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/book?type=flight&id=${f.id}`);
                        }}
                      >
                        Book
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flight-card-meta">
                    <span>{f.aircraftType || "Standard aircraft"}</span>
                    <span className="flight-dot" />
                    <span>{f.availableSeats} seats left</span>
                    <span className="flight-dot" />
                    <span>Economy</span>
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
    </div>
  );
}
