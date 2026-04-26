import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Icon } from "../components/Icons";

const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) =>
  new Date(d).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

function getContext(b) {
  if (b.status === "PENDING") return { label: "Awaiting payment", tone: "warn", icon: Icon.Clock };
  if (b.status === "CANCELLED") return { label: "Cancelled", tone: "muted", icon: Icon.Check };
  if (b.status === "MODIFIED") return { label: "Modified", tone: "info", icon: Icon.Check };

  const now = Date.now();
  let earliest = null;
  for (const item of b.items || []) {
    const d = item.flight?.departureDate || item.checkIn;
    if (d) {
      const t = new Date(d).getTime();
      if (!earliest || t < earliest) earliest = t;
    }
  }
  if (earliest) {
    if (earliest > now) return { label: "Upcoming trip", tone: "good", icon: Icon.Plane };
    return { label: "Completed", tone: "muted", icon: Icon.Check };
  }
  const daysSince = (now - new Date(b.bookingDate).getTime()) / 86400000;
  if (daysSince < 7) return { label: "Recently booked", tone: "good", icon: Icon.Sparkle };
  return { label: "Confirmed", tone: "good", icon: Icon.Check };
}

function getTypeMeta(item) {
  if (item?.flight) return { type: "flight", Icon: Icon.Plane, label: item.flight.airlineName };
  if (item?.hotel) return { type: "hotel", Icon: Icon.Hotel, label: "Stay" };
  if (item?.package) return { type: "package", Icon: Icon.Package, label: "Package" };
  return { type: "other", Icon: Icon.Pin, label: "Trip" };
}

function RouteVisual({ item }) {
  if (item?.flight) {
    return (
      <div className="dash-route">
        <span className="dash-route__code">{item.flight.departurePort}</span>
        <span className="dash-route__line">
          <span className="dash-route__dot" />
          <span className="dash-route__dash" />
          <Icon.Plane className="dash-route__plane" width="16" height="16" />
          <span className="dash-route__dash" />
          <span className="dash-route__dot" />
        </span>
        <span className="dash-route__code">{item.flight.arrivalPort}</span>
      </div>
    );
  }
  if (item?.hotel) {
    return (
      <div className="dash-route dash-route--static">
        <Icon.Pin className="dash-route__icon" width="18" height="18" />
        <span className="dash-route__code">{item.hotel.name}</span>
        <span className="dash-route__sep">·</span>
        <span className="dash-route__city">{item.hotel.city}</span>
      </div>
    );
  }
  if (item?.package) {
    return (
      <div className="dash-route dash-route--static">
        <Icon.Sparkle className="dash-route__icon" width="16" height="16" />
        <span className="dash-route__code">{item.package.packageName}</span>
      </div>
    );
  }
  return null;
}

function BookingCard({ b, onCancel, cancellingId, navigate }) {
  const ctx = getContext(b);
  const first = b.items?.[0];
  const typeMeta = getTypeMeta(first);
  const CtxIcon = ctx.icon;
  const TypeIcon = typeMeta.Icon;

  const airlineMark = first?.flight?.airlineName?.charAt(0) || "";
  const subTitle = first?.flight
    ? `${first.flight.airlineName} · ${first.flight.flightNumber} · Nonstop`
    : first?.hotel
    ? `${first.hotel.country}${first.hotel.starRating ? ` · ${"★".repeat(first.hotel.starRating)}` : ""}`
    : first?.package
    ? "Curated travel package"
    : "";

  const tripDate = first?.flight?.departureDate || first?.checkIn;

  const openDetails = () => navigate(`/bookings/${b.id}`);
  const stop = (e) => e.stopPropagation();

  return (
    <article
      className={`dash-card dash-card--${ctx.tone} dash-card--${typeMeta.type}`}
      onClick={openDetails}
      onKeyDown={(e) => { if (e.key === "Enter") openDetails(); }}
      tabIndex={0}
      role="button"
    >
      <span className="dash-card__watermark" aria-hidden>
        <TypeIcon width="140" height="140" />
      </span>

      <div className="dash-card__top">
        <div className="dash-card__tags">
          <span className={`dash-status dash-status--${b.status.toLowerCase()}`}>
            <span className="dash-status__dot" />
            {b.status.toLowerCase()}
          </span>
          <span className={`dash-ctx dash-ctx--${ctx.tone}`}>
            <CtxIcon width="12" height="12" />
            {ctx.label}
          </span>
        </div>
        <span className="dash-card__date">
          <Icon.Calendar width="12" height="12" />
          Booked {fmtDate(b.bookingDate)}
        </span>
      </div>

      <div className="dash-card__body">
        <div className="dash-card__route-row">
          {first?.flight && (
            <div className="dash-airline-mark" aria-hidden>{airlineMark}</div>
          )}
          {!first?.flight && (
            <div className="dash-airline-mark dash-airline-mark--alt" aria-hidden>
              <TypeIcon width="18" height="18" />
            </div>
          )}
          <RouteVisual item={first} />
        </div>
        {subTitle && <div className="dash-card__sub">{subTitle}</div>}
        <div className="dash-card__meta">
          {tripDate && (
            <span className="dash-card__when">
              <Icon.Calendar width="13" height="13" />
              {fmtDate(tripDate)}
            </span>
          )}
          {b.items?.length > 1 && (
            <span className="dash-card__extra">
              +{b.items.length - 1} more item{b.items.length - 1 === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <div className="dash-card__foot">
        <div className="dash-card__price">
          <div className="dash-card__price-icon" aria-hidden>
            <Icon.Dollar width="15" height="15" />
          </div>
          <div>
            <span className="dash-card__price-label">Total</span>
            <strong>{fmtMoney(b.totalAmount)}</strong>
            {b.invoice && (
              <small>Invoice {b.invoice.invoiceNumber}</small>
            )}
          </div>
        </div>
        <div className="dash-card__actions" onClick={stop}>
          {b.status === "PENDING" && (
            <button
              className="btn btn-primary btn-sm"
              onClick={(e) => { stop(e); navigate(`/payment/${b.id}`); }}
            >
              Pay now
            </button>
          )}
          {(b.status === "CONFIRMED" || b.status === "PENDING") && (
            <button
              className="dash-cancel"
              onClick={(e) => { stop(e); onCancel(b); }}
              disabled={cancellingId === b.id}
            >
              {cancellingId === b.id ? "Cancelling…" : "Cancel"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchBookings = async () => {
    try {
      const res = await api.get("/bookings");
      setBookings(res.data.bookings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleCancel = async (booking) => {
    const isPaid = booking.status === "CONFIRMED";
    const confirmMsg = isPaid
      ? "Cancel this booking? A 20% cancellation fee applies."
      : "Cancel this unpaid booking?";
    if (!window.confirm(confirmMsg)) return;

    setCancellingId(booking.id);
    try {
      const res = await api.post(`/bookings/${booking.id}/cancel`);
      if (isPaid) {
        alert(`Booking cancelled. Refund: $${res.data.refundAmount.toFixed(2)} (Fee: $${res.data.cancellationFee.toFixed(2)})`);
      } else {
        alert("Booking cancelled.");
      }
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.error?.message || "Cancel failed");
    } finally {
      setCancellingId(null);
    }
  };

  const currentYear = new Date().getFullYear();
  const tripsThisYear = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.status !== "CANCELLED" &&
          new Date(b.bookingDate).getFullYear() === currentYear
      ).length,
    [bookings, currentYear]
  );

  const displayName =
    user?.profile?.firstName ||
    (user?.email ? user.email.split("@")[0] : "traveler");

  return (
    <div className="dash-page">
      <div className="dash-page__bg" aria-hidden />
      <div className="dash-page__inner">
        <header className="dash-hero">
          <span className="dash-hero__art" aria-hidden>
            <Icon.Plane width="260" height="260" />
          </span>
          <div className="dash-hero__content">
            <div className="dash-hero__eyebrow">
              <Icon.Pin width="12" height="12" />
              Your travel hub
            </div>
            <h1>Welcome back, {displayName}</h1>
            <p>Manage your bookings and upcoming journeys, all in one place.</p>
          </div>
          <div className="dash-hero__stat">
            <div className="dash-hero__stat-icon" aria-hidden>
              <Icon.Plane width="18" height="18" />
            </div>
            <div>
              <div className="dash-hero__stat-num">{tripsThisYear}</div>
              <div className="dash-hero__stat-label">
                trip{tripsThisYear === 1 ? "" : "s"} in {currentYear}
              </div>
            </div>
          </div>
        </header>

        <section className="dash-section">
          <div className="dash-section__head">
            <h2>Your bookings</h2>
            {!loading && bookings.length > 0 && (
              <span className="dash-section__count">
                {bookings.length} {bookings.length === 1 ? "trip" : "trips"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="loading">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty__icon" aria-hidden>
                <Icon.Plane width="32" height="32" />
              </div>
              <h3>No trips yet</h3>
              <p>Your future adventures will appear here. Start by exploring flights, hotels, or packages.</p>
              <div className="dash-empty__actions">
                <button className="btn btn-primary" onClick={() => navigate("/flights")}>
                  Browse flights
                </button>
                <button className="btn btn-outline" onClick={() => navigate("/packages")}>
                  Explore packages
                </button>
              </div>
            </div>
          ) : (
            <div className="dash-list">
              {bookings.map((b) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  onCancel={handleCancel}
                  cancellingId={cancellingId}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
