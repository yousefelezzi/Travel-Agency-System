import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
const fmtDate = (d) =>
  new Date(d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

function Stepper({ current }) {
  const steps = ["Details", "Payment", "Confirmation"];
  return (
    <div className="book-stepper" aria-label="Booking progress">
      {steps.map((label, i) => {
        const state =
          i < current ? "done" : i === current ? "active" : "todo";
        return (
          <div key={label} className={`book-step book-step--${state}`}>
            <div className="book-step__circle">
              {i < current ? (
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            <div className="book-step__label">{label}</div>
            {i < steps.length - 1 && <div className="book-step__bar" />}
          </div>
        );
      })}
    </div>
  );
}

function FlightSummary({ item, seatClass, setSeatClass, passengerCount }) {
  const durationMs = new Date(item.arrivalDate) - new Date(item.departureDate);
  const durH = Math.max(0, Math.floor(durationMs / 3600000));
  const durM = Math.max(0, Math.floor((durationMs % 3600000) / 60000));
  const unitPrice =
    seatClass === "business" && item.businessPrice
      ? Number(item.businessPrice)
      : Number(item.economyPrice);
  const subtotal = unitPrice * passengerCount;

  return (
    <>
      <div className="book-sum__header">
        <div className="book-sum__airline">
          <div className="book-sum__airline-mark">
            {item.airlineName?.charAt(0) || "✈"}
          </div>
          <div>
            <div className="book-sum__airline-name">{item.airlineName}</div>
            <div className="book-sum__airline-num">{item.flightNumber}</div>
          </div>
        </div>
        <span className="book-chip">Nonstop</span>
      </div>

      <div className="book-route">
        <div className="book-route__col">
          <div className="book-route__time">{fmtTime(item.departureDate)}</div>
          <div className="book-route__code">{item.departurePort}</div>
          <div className="book-route__sub">{fmtDate(item.departureDate)}</div>
        </div>

        <div className="book-route__line">
          <span className="book-route__dot" />
          <span className="book-route__dash" />
          <svg className="book-route__plane" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          <span className="book-route__dash" />
          <span className="book-route__dot" />
          <div className="book-route__duration">
            {durH}h {durM}m · Direct flight
          </div>
        </div>

        <div className="book-route__col book-route__col--right">
          <div className="book-route__time">{fmtTime(item.arrivalDate)}</div>
          <div className="book-route__code">{item.arrivalPort}</div>
          <div className="book-route__sub">{fmtDate(item.arrivalDate)}</div>
        </div>
      </div>

      <div className="book-sum__field">
        <label>Cabin class</label>
        <div className="book-cabin">
          <button
            type="button"
            className={`book-cabin__opt ${seatClass === "economy" ? "is-active" : ""}`}
            onClick={() => setSeatClass("economy")}
          >
            <span>Economy</span>
            <strong>{fmtMoney(item.economyPrice)}</strong>
          </button>
          {item.businessPrice && (
            <button
              type="button"
              className={`book-cabin__opt ${seatClass === "business" ? "is-active" : ""}`}
              onClick={() => setSeatClass("business")}
            >
              <span>Business</span>
              <strong>{fmtMoney(item.businessPrice)}</strong>
            </button>
          )}
        </div>
      </div>

      <PriceBreakdown
        unitLabel={`${seatClass === "business" ? "Business" : "Economy"} fare × ${passengerCount}`}
        unitPrice={unitPrice}
        quantity={passengerCount}
        subtotal={subtotal}
      />
    </>
  );
}

function HotelSummary({ item, checkIn, setCheckIn, checkOut, setCheckOut, passengerCount }) {
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const n = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, n);
  }, [checkIn, checkOut]);

  const unit = Number(item.pricePerNight);
  const subtotal = unit * nights;

  return (
    <>
      <div className="book-sum__header">
        <div className="book-sum__airline">
          <div className="book-sum__airline-mark">{item.name?.charAt(0)}</div>
          <div>
            <div className="book-sum__airline-name">{item.name}</div>
            <div className="book-sum__airline-num">
              {item.city}, {item.country}
              {item.starRating ? ` · ${"★".repeat(item.starRating)}` : ""}
            </div>
          </div>
        </div>
        <span className="book-chip">Hotel</span>
      </div>

      <div className="book-sum__grid2">
        <div className="book-sum__field">
          <label>Check-in</label>
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
        </div>
        <div className="book-sum__field">
          <label>Check-out</label>
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
        </div>
      </div>

      <PriceBreakdown
        unitLabel={`${fmtMoney(unit)} × ${nights} night${nights === 1 ? "" : "s"}`}
        unitPrice={unit}
        quantity={nights}
        subtotal={subtotal}
        extra={`${passengerCount} guest${passengerCount === 1 ? "" : "s"}`}
      />
    </>
  );
}

function PackageSummary({ item, passengerCount }) {
  const unit = Number(item.price) * (1 - Number(item.discount || 0) / 100);
  const subtotal = unit * passengerCount;

  return (
    <>
      <div className="book-sum__header">
        <div className="book-sum__airline">
          <div className="book-sum__airline-mark">★</div>
          <div>
            <div className="book-sum__airline-name">{item.packageName}</div>
            {item.discount > 0 && (
              <div className="book-sum__airline-num">{Number(item.discount)}% off</div>
            )}
          </div>
        </div>
        <span className="book-chip">Package</span>
      </div>
      {item.description && (
        <p className="book-sum__desc">{item.description}</p>
      )}
      <PriceBreakdown
        unitLabel={`${fmtMoney(unit)} × ${passengerCount} traveler${passengerCount === 1 ? "" : "s"}`}
        unitPrice={unit}
        quantity={passengerCount}
        subtotal={subtotal}
      />
    </>
  );
}

function PriceBreakdown({ unitLabel, subtotal, extra }) {
  return (
    <div className="book-price">
      <div className="book-price__row">
        <span>{unitLabel}</span>
        <span>{fmtMoney(subtotal)}</span>
      </div>
      {extra && (
        <div className="book-price__row book-price__row--muted">
          <span>{extra}</span>
          <span>—</span>
        </div>
      )}
      <div className="book-price__divider" />
      <div className="book-price__total">
        <span>Total</span>
        <strong>{fmtMoney(subtotal)}</strong>
      </div>
      <div className="book-price__note">Taxes & fees included</div>
    </div>
  );
}

function PassengerBlock({ index, total, p, onChange, onRemove }) {
  return (
    <div className="book-passenger">
      <div className="book-passenger__head">
        <div className="book-passenger__num">{index + 1}</div>
        <div className="book-passenger__title">
          <h4>Passenger {index + 1}</h4>
          <span>Details as they appear on travel document</span>
        </div>
        {total > 1 && (
          <button type="button" className="book-link-btn" onClick={() => onRemove(index)}>
            Remove
          </button>
        )}
      </div>

      <div className="book-field-grid">
        <div className="book-field">
          <label>First name *</label>
          <input value={p.firstName} onChange={(e) => onChange(index, "firstName", e.target.value)} required />
        </div>
        <div className="book-field">
          <label>Last name *</label>
          <input value={p.lastName} onChange={(e) => onChange(index, "lastName", e.target.value)} required />
        </div>
        <div className="book-field">
          <label>Date of birth *</label>
          <input type="date" value={p.dateOfBirth} onChange={(e) => onChange(index, "dateOfBirth", e.target.value)} required />
        </div>
        <div className="book-field">
          <label>Nationality</label>
          <input value={p.nationality} onChange={(e) => onChange(index, "nationality", e.target.value)} placeholder="e.g. Lebanese" />
        </div>
        <div className="book-field book-field--full">
          <label>Passport number</label>
          <input value={p.passportNumber} onChange={(e) => onChange(index, "passportNumber", e.target.value)} placeholder="Optional for domestic trips" />
        </div>
      </div>
    </div>
  );
}

export default function Book() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const type = searchParams.get("type");
  const id = searchParams.get("id");

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [seatClass, setSeatClass] = useState("economy");

  const [passengers, setPassengers] = useState([
    { firstName: "", lastName: "", dateOfBirth: "", passportNumber: "", nationality: "" },
  ]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const fetchItem = async () => {
      try {
        const res = await api.get(`/${type}s/${id}`);
        setItem(res.data[type] || res.data.package);
      } catch {
        setError("Item not found.");
      } finally {
        setLoading(false);
      }
    };
    if (type && id) fetchItem();
    else { setError("Invalid booking request."); setLoading(false); }
  }, [type, id, user, navigate]);

  const updatePassenger = (index, field, value) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const addPassenger = () => {
    setPassengers([...passengers, { firstName: "", lastName: "", dateOfBirth: "", passportNumber: "", nationality: "" }]);
  };

  const removePassenger = (index) => {
    if (passengers.length <= 1) return;
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const totalAmount = useMemo(() => {
    if (!item) return 0;
    if (type === "flight") {
      const unit = seatClass === "business" && item.businessPrice
        ? Number(item.businessPrice)
        : Number(item.economyPrice);
      return unit * passengers.length;
    }
    if (type === "hotel") {
      if (!checkIn || !checkOut) return 0;
      const nights = Math.max(0, Math.ceil(
        (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
      ));
      return Number(item.pricePerNight) * nights;
    }
    if (type === "package") {
      const unit = Number(item.price) * (1 - Number(item.discount || 0) / 100);
      return unit * passengers.length;
    }
    return 0;
  }, [item, type, seatClass, passengers.length, checkIn, checkOut]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    for (const p of passengers) {
      if (!p.firstName || !p.lastName || !p.dateOfBirth) {
        setError("All passengers must have a first name, last name, and date of birth.");
        setSubmitting(false);
        return;
      }
    }

    const bookingItem = { type, id, quantity: passengers.length };
    if (type === "hotel") {
      if (!checkIn || !checkOut) {
        setError("Check-in and check-out dates are required for hotels.");
        setSubmitting(false);
        return;
      }
      bookingItem.checkIn = checkIn;
      bookingItem.checkOut = checkOut;
      bookingItem.quantity = 1;
    }
    if (type === "flight") {
      bookingItem.seatClass = seatClass;
    }

    try {
      const res = await api.post("/bookings", {
        items: [bookingItem],
        passengers,
      });
      navigate(`/payment/${res.data.booking.id}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error && !item) return <div className="page"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className="book-page">
      <div className="book-page__inner">
        <Stepper current={0} />

        <div className="book-page__head">
          <h1>Complete your booking</h1>
          <p>You're one step away from your trip — no hidden fees, secure checkout.</p>
        </div>

        <div className="book-grid">
          {/* LEFT — Sticky summary */}
          <aside className="book-sum">
            <div className="book-sum__card">
              <div className="book-sum__eyebrow">Your selection</div>
              {type === "flight" && (
                <FlightSummary
                  item={item}
                  seatClass={seatClass}
                  setSeatClass={setSeatClass}
                  passengerCount={passengers.length}
                />
              )}
              {type === "hotel" && (
                <HotelSummary
                  item={item}
                  checkIn={checkIn}
                  setCheckIn={setCheckIn}
                  checkOut={checkOut}
                  setCheckOut={setCheckOut}
                  passengerCount={passengers.length}
                />
              )}
              {type === "package" && (
                <PackageSummary item={item} passengerCount={passengers.length} />
              )}
            </div>

            <div className="book-trust">
              <div className="book-trust__row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Secure checkout · Your data is encrypted</span>
              </div>
              <div className="book-trust__row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <span>Free to cancel before payment</span>
              </div>
            </div>
          </aside>

          {/* RIGHT — Form */}
          <form onSubmit={handleSubmit} className="book-form">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="book-form__section-head">
              <div>
                <h2>Passenger details</h2>
                <p>Enter details exactly as they appear on the passport or ID.</p>
              </div>
              <button type="button" className="book-add-btn" onClick={addPassenger}>
                + Add passenger
              </button>
            </div>

            <div className="book-passengers">
              {passengers.map((p, i) => (
                <PassengerBlock
                  key={i}
                  index={i}
                  total={passengers.length}
                  p={p}
                  onChange={updatePassenger}
                  onRemove={removePassenger}
                />
              ))}
            </div>

            <div className="book-cta">
              <div className="book-cta__total">
                <span>Total due</span>
                <strong>{fmtMoney(totalAmount)}</strong>
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-lg book-cta__btn"
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Continue to payment →"}
              </button>
              <div className="book-cta__note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
                Secure booking — you won't be charged until the next step
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
