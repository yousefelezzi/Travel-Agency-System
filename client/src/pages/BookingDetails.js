import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { Icon } from "../components/Icons";

const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) =>
  new Date(d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const fmtDateShort = (d) =>
  new Date(d).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

function getContext(b) {
  if (b.status === "PENDING") return { label: "Awaiting payment", tone: "warn", Icon: Icon.Clock };
  if (b.status === "CANCELLED") return { label: "Cancelled", tone: "muted", Icon: Icon.Check };
  if (b.status === "MODIFIED") return { label: "Modified", tone: "info", Icon: Icon.Check };
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
    if (earliest > now) return { label: "Upcoming trip", tone: "good", Icon: Icon.Plane };
    return { label: "Completed", tone: "muted", Icon: Icon.Check };
  }
  return { label: "Confirmed", tone: "good", Icon: Icon.Check };
}

function FlightItem({ item }) {
  const durationMs = new Date(item.flight.arrivalDate) - new Date(item.flight.departureDate);
  const durH = Math.max(0, Math.floor(durationMs / 3600000));
  const durM = Math.max(0, Math.floor((durationMs % 3600000) / 60000));

  return (
    <div className="bd-item bd-item--flight">
      <div className="bd-item__head">
        <div className="bd-airline-mark">
          {item.flight.airlineName?.charAt(0) || "✈"}
        </div>
        <div className="bd-item__title">
          <h3>{item.flight.airlineName}</h3>
          <span>
            {item.flight.flightNumber}
            {item.seatClass && ` · ${item.seatClass.charAt(0).toUpperCase() + item.seatClass.slice(1)}`}
          </span>
        </div>
        <span className="bd-chip">Flight</span>
      </div>

      <div className="bd-flight-route">
        <div className="bd-flight-route__col">
          <div className="bd-flight-route__time">{fmtTime(item.flight.departureDate)}</div>
          <div className="bd-flight-route__code">{item.flight.departurePort}</div>
          <div className="bd-flight-route__sub">{fmtDateShort(item.flight.departureDate)}</div>
        </div>
        <div className="bd-flight-route__line">
          <span className="bd-flight-route__dot" />
          <span className="bd-flight-route__dash" />
          <Icon.Plane className="bd-flight-route__plane" width="18" height="18" />
          <span className="bd-flight-route__dash" />
          <span className="bd-flight-route__dot" />
          <div className="bd-flight-route__duration">
            {durH}h {durM}m · Direct
          </div>
        </div>
        <div className="bd-flight-route__col bd-flight-route__col--right">
          <div className="bd-flight-route__time">{fmtTime(item.flight.arrivalDate)}</div>
          <div className="bd-flight-route__code">{item.flight.arrivalPort}</div>
          <div className="bd-flight-route__sub">{fmtDateShort(item.flight.arrivalDate)}</div>
        </div>
      </div>

      <div className="bd-item__foot">
        <span>{item.quantity} seat{item.quantity === 1 ? "" : "s"}</span>
        <strong>{fmtMoney(Number(item.unitPrice) * item.quantity)}</strong>
      </div>
    </div>
  );
}

function HotelItem({ item }) {
  const nights = item.checkIn && item.checkOut
    ? Math.max(0, Math.ceil((new Date(item.checkOut) - new Date(item.checkIn)) / 86400000))
    : 0;
  return (
    <div className="bd-item">
      <div className="bd-item__head">
        <div className="bd-airline-mark bd-airline-mark--alt">
          <Icon.Hotel width="18" height="18" />
        </div>
        <div className="bd-item__title">
          <h3>{item.hotel.name}</h3>
          <span>
            {item.hotel.city}, {item.hotel.country}
            {item.hotel.starRating ? ` · ${"★".repeat(item.hotel.starRating)}` : ""}
          </span>
        </div>
        <span className="bd-chip">Stay</span>
      </div>

      <div className="bd-kv">
        <div>
          <div className="bd-kv__label"><Icon.Calendar width="12" height="12" /> Check-in</div>
          <div className="bd-kv__value">{item.checkIn ? fmtDate(item.checkIn) : "—"}</div>
        </div>
        <div>
          <div className="bd-kv__label"><Icon.Calendar width="12" height="12" /> Check-out</div>
          <div className="bd-kv__value">{item.checkOut ? fmtDate(item.checkOut) : "—"}</div>
        </div>
        <div>
          <div className="bd-kv__label">Nights</div>
          <div className="bd-kv__value">{nights}</div>
        </div>
      </div>

      <div className="bd-item__foot">
        <span>Room × {item.quantity}</span>
        <strong>{fmtMoney(item.unitPrice)}</strong>
      </div>
    </div>
  );
}

function PackageItem({ item }) {
  return (
    <div className="bd-item">
      <div className="bd-item__head">
        <div className="bd-airline-mark bd-airline-mark--alt">
          <Icon.Package width="18" height="18" />
        </div>
        <div className="bd-item__title">
          <h3>{item.package.packageName}</h3>
          <span>Curated travel package</span>
        </div>
        <span className="bd-chip">Package</span>
      </div>
      {item.package.description && (
        <p className="bd-item__desc">{item.package.description}</p>
      )}
      <div className="bd-item__foot">
        <span>Travelers × {item.quantity}</span>
        <strong>{fmtMoney(Number(item.unitPrice) * item.quantity)}</strong>
      </div>
    </div>
  );
}

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Cancel modal state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  // Modify modal state
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyDrafts, setModifyDrafts] = useState({}); // { itemId: { checkIn, checkOut } }
  const [modifyBusy, setModifyBusy] = useState(false);
  const [modifyError, setModifyError] = useState("");

  const fetchBooking = async () => {
    try {
      const res = await api.get(`/bookings/${id}`);
      setBooking(res.data.booking);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Booking not found.");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchBooking(); }, [id]);

  const openCancelModal = async () => {
    setCancelOpen(true);
    setQuote(null);
    setQuoteError("");
    setQuoteLoading(true);
    try {
      const res = await api.get(`/bookings/${booking.id}/cancellation-quote`);
      setQuote(res.data.quote);
    } catch (err) {
      setQuoteError(
        err.response?.data?.error?.message || "Couldn't load cancellation policy."
      );
    } finally {
      setQuoteLoading(false);
    }
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await api.post(`/bookings/${booking.id}/cancel`);
      setCancelOpen(false);
      fetchBooking();
    } catch (err) {
      setQuoteError(err.response?.data?.error?.message || "Cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  const openModifyModal = () => {
    const drafts = {};
    (booking.items || []).forEach((i) => {
      if (i.hotelId) {
        drafts[i.id] = {
          checkIn: i.checkIn ? i.checkIn.slice(0, 10) : "",
          checkOut: i.checkOut ? i.checkOut.slice(0, 10) : "",
        };
      }
    });
    setModifyDrafts(drafts);
    setModifyError("");
    setModifyOpen(true);
  };

  const submitModify = async () => {
    const updates = Object.entries(modifyDrafts)
      .filter(([, v]) => v.checkIn && v.checkOut)
      .map(([id, v]) => ({
        id,
        checkIn: v.checkIn,
        checkOut: v.checkOut,
      }));
    if (updates.length === 0) {
      setModifyError("Pick new dates for at least one stay.");
      return;
    }
    for (const u of updates) {
      if (new Date(u.checkOut) <= new Date(u.checkIn)) {
        setModifyError("Check-out must be after check-in.");
        return;
      }
    }
    setModifyBusy(true);
    setModifyError("");
    try {
      await api.put(`/bookings/${booking.id}/modify`, { items: updates });
      setModifyOpen(false);
      fetchBooking();
    } catch (err) {
      setModifyError(
        err.response?.data?.error?.message || "Modification failed."
      );
    } finally {
      setModifyBusy(false);
    }
  };

  const fmtMoneyLocal = (n) => `$${Number(n || 0).toFixed(2)}`;

  const downloadInvoice = async () => {
    try {
      const res = await api.get(`/bookings/${booking.id}/invoice.pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `ATLAS-${booking.invoice?.invoiceNumber || booking.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        err.response?.data?.error?.message ||
          "Couldn't download invoice. Make sure payment is complete."
      );
    }
  };
  const hasHotelItem = (booking?.items || []).some((i) => i.hotelId);
  const canModify =
    booking && (booking.status === "CONFIRMED" || booking.status === "PENDING") && hasHotelItem;

  if (loading) return <div className="loading">Loading booking...</div>;
  if (error || !booking) {
    return (
      <div className="bd-page">
        <div className="bd-page__inner">
          <div className="alert alert-error">{error || "Booking not found."}</div>
          <button className="btn btn-outline" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const ctx = getContext(booking);
  const CtxIcon = ctx.Icon;
  const first = booking.items?.[0];
  const firstFlight = first?.flight;
  const payment = booking.payments?.[0];

  return (
    <div className="bd-page">
      <div className="bd-page__bg" aria-hidden />
      <div className="bd-page__inner">
        <button className="bd-back" onClick={() => navigate("/dashboard")}>
          <Icon.ArrowLeft width="16" height="16" />
          All bookings
        </button>

        <header className="bd-hero">
          <div className="bd-hero__tags">
            <span className={`dash-status dash-status--${booking.status.toLowerCase()}`}>
              <span className="dash-status__dot" />
              {booking.status.toLowerCase()}
            </span>
            <span className={`dash-ctx dash-ctx--${ctx.tone}`}>
              <CtxIcon width="12" height="12" />
              {ctx.label}
            </span>
          </div>

          <h1>
            {firstFlight
              ? `${firstFlight.departurePort} → ${firstFlight.arrivalPort}`
              : first?.hotel?.name
              ? first.hotel.name
              : first?.package?.packageName || "Your trip"}
          </h1>
          <p>
            Booking <strong>#{booking.id.slice(0, 8)}</strong>
            {" · "}
            Booked on {fmtDate(booking.bookingDate)}
          </p>
        </header>

        <div className="bd-grid">
          {/* LEFT — sticky summary */}
          <aside className="bd-summary">
            <div className="bd-summary__card">
              <div className="bd-summary__eyebrow">Trip summary</div>

              <div className="bd-summary__row">
                <span>Travelers</span>
                <strong>{booking.numberOfPersons}</strong>
              </div>
              <div className="bd-summary__row">
                <span>Items</span>
                <strong>{booking.items?.length || 0}</strong>
              </div>
              {booking.invoice && (
                <>
                  <div className="bd-summary__row">
                    <span>Invoice</span>
                    <strong className="bd-mono">{booking.invoice.invoiceNumber}</strong>
                  </div>
                  <button
                    type="button"
                    className="bd-invoice-dl"
                    onClick={downloadInvoice}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Download invoice (PDF)
                  </button>
                </>
              )}

              <div className="bd-summary__divider" />

              <div className="bd-summary__total">
                <span>Total</span>
                <strong>{fmtMoney(booking.totalAmount)}</strong>
              </div>

              {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                <div className="bd-summary__actions">
                  {booking.status === "PENDING" && (
                    <button
                      className="btn btn-primary btn-full"
                      onClick={() => navigate(`/payment/${booking.id}`)}
                    >
                      Complete payment
                    </button>
                  )}
                  {canModify && (
                    <button
                      className="btn btn-outline btn-full"
                      onClick={openModifyModal}
                    >
                      Modify booking
                    </button>
                  )}
                  <button
                    className="bd-cancel"
                    onClick={openCancelModal}
                    disabled={cancelling}
                  >
                    {cancelling ? "Cancelling…" : "Cancel booking"}
                  </button>
                </div>
              )}
            </div>

            <div className="bd-trust">
              <div className="bd-trust__row">
                <Icon.Check width="14" height="14" />
                <span>Booking securely stored</span>
              </div>
              <div className="bd-trust__row">
                <Icon.Card width="14" height="14" />
                <span>Payments processed via Stripe</span>
              </div>
            </div>
          </aside>

          {/* RIGHT — content */}
          <div className="bd-content">
            <section className="bd-section">
              <div className="bd-section__head">
                <Icon.Plane width="18" height="18" />
                <h2>Itinerary</h2>
                <span>{booking.items?.length || 0} item{booking.items?.length === 1 ? "" : "s"}</span>
              </div>
              <div className="bd-items">
                {booking.items?.map((item, i) => (
                  <div key={i}>
                    {item.flight && <FlightItem item={item} />}
                    {item.hotel && <HotelItem item={item} />}
                    {item.package && <PackageItem item={item} />}
                  </div>
                ))}
              </div>
            </section>

            <section className="bd-section">
              <div className="bd-section__head">
                <Icon.User width="18" height="18" />
                <h2>Travelers</h2>
                <span>{booking.passengers?.length || 0}</span>
              </div>
              <div className="bd-passengers">
                {booking.passengers?.map((p, i) => (
                  <div key={p.id || i} className="bd-passenger">
                    <div className="bd-passenger__num">{i + 1}</div>
                    <div className="bd-passenger__body">
                      <h4>
                        {p.firstName} {p.middleName} {p.lastName}
                      </h4>
                      <div className="bd-passenger__meta">
                        <span>
                          <Icon.Calendar width="12" height="12" />
                          DOB {fmtDateShort(p.dateOfBirth)}
                        </span>
                        {p.nationality && (
                          <span>
                            <Icon.Pin width="12" height="12" />
                            {p.nationality}
                          </span>
                        )}
                        {p.passportNumber && (
                          <span>
                            <Icon.Doc width="12" height="12" />
                            Passport {p.passportNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {payment && (
              <section className="bd-section">
                <div className="bd-section__head">
                  <Icon.Card width="18" height="18" />
                  <h2>Payment</h2>
                </div>
                <div className="bd-payment">
                  <div className="bd-payment__row">
                    <span>Method</span>
                    <strong>{payment.paymentMethod.replace("_", " ")}</strong>
                  </div>
                  <div className="bd-payment__row">
                    <span>Amount</span>
                    <strong>{fmtMoney(payment.amount)}</strong>
                  </div>
                  <div className="bd-payment__row">
                    <span>Paid on</span>
                    <strong>{fmtDate(payment.paymentDate)}</strong>
                  </div>
                  {payment.transactionRef && (
                    <div className="bd-payment__row">
                      <span>Reference</span>
                      <strong className="bd-mono">{payment.transactionRef}</strong>
                    </div>
                  )}
                </div>
              </section>
            )}

            {booking.invoice && (
              <section className="bd-section">
                <div className="bd-section__head">
                  <Icon.Doc width="18" height="18" />
                  <h2>Invoice</h2>
                </div>
                <div className="bd-invoice">
                  <div>
                    <div className="bd-invoice__num">{booking.invoice.invoiceNumber}</div>
                    <div className="bd-invoice__sub">
                      Issued {fmtDate(booking.invoice.issuedAt)}
                    </div>
                  </div>
                  <div className="bd-invoice__amount">
                    {fmtMoney(booking.invoice.totalAmount)}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* ── Cancel booking modal ── */}
      {cancelOpen && (
        <div className="bd-modal-backdrop" onClick={() => !cancelling && setCancelOpen(false)}>
          <div className="bd-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header className="bd-modal__head">
              <h3>Cancel this booking?</h3>
              <button
                type="button"
                className="bd-modal__close"
                onClick={() => !cancelling && setCancelOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <div className="bd-modal__body">
              {quoteLoading ? (
                <p className="bd-modal__muted">Calculating cancellation fee…</p>
              ) : quoteError ? (
                <div className="alert alert-error">{quoteError}</div>
              ) : quote ? (
                <>
                  <div className="bd-modal__row">
                    <span>Booking total</span>
                    <strong>{fmtMoneyLocal(booking.totalAmount)}</strong>
                  </div>
                  <div className="bd-modal__row bd-modal__row--fee">
                    <span>
                      Cancellation fee ({quote.feePercent}%)
                    </span>
                    <strong>− {fmtMoneyLocal(quote.feeAmount)}</strong>
                  </div>
                  <div className="bd-modal__divider" />
                  <div className="bd-modal__row bd-modal__row--total">
                    <span>You'll be refunded</span>
                    <strong>{fmtMoneyLocal(quote.refundAmount)}</strong>
                  </div>
                  {quote.reason && (
                    <p className="bd-modal__reason">{quote.reason}</p>
                  )}
                  <p className="bd-modal__muted">
                    Refund returns to the original payment method (typically 5–10 business days). A confirmation email will be sent.
                  </p>
                </>
              ) : null}
            </div>
            <footer className="bd-modal__foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCancelOpen(false)}
                disabled={cancelling}
              >
                Keep booking
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmCancel}
                disabled={cancelling || quoteLoading || !!quoteError}
              >
                {cancelling ? "Cancelling…" : "Yes, cancel"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ── Modify booking modal ── */}
      {modifyOpen && (
        <div className="bd-modal-backdrop" onClick={() => !modifyBusy && setModifyOpen(false)}>
          <div className="bd-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header className="bd-modal__head">
              <h3>Modify your booking</h3>
              <button
                type="button"
                className="bd-modal__close"
                onClick={() => !modifyBusy && setModifyOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <div className="bd-modal__body">
              <p className="bd-modal__muted">
                Change your stay dates. The total will be recalculated at the nightly rate.
              </p>
              {(booking.items || [])
                .filter((i) => i.hotelId)
                .map((i) => {
                  const draft = modifyDrafts[i.id] || { checkIn: "", checkOut: "" };
                  const set = (key) => (e) =>
                    setModifyDrafts((d) => ({
                      ...d,
                      [i.id]: { ...d[i.id], [key]: e.target.value },
                    }));
                  return (
                    <div key={i.id} className="bd-modify-item">
                      <div className="bd-modify-item__title">
                        {i.hotel?.name} <span>· {i.hotel?.city}</span>
                      </div>
                      <div className="bd-modify-item__fields">
                        <label>
                          <span>Check-in</span>
                          <input
                            type="date"
                            value={draft.checkIn}
                            onChange={set("checkIn")}
                          />
                        </label>
                        <label>
                          <span>Check-out</span>
                          <input
                            type="date"
                            value={draft.checkOut}
                            onChange={set("checkOut")}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              {modifyError && <div className="alert alert-error">{modifyError}</div>}
            </div>
            <footer className="bd-modal__foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setModifyOpen(false)}
                disabled={modifyBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submitModify}
                disabled={modifyBusy}
              >
                {modifyBusy ? "Saving…" : "Save changes"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
