import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import api from "../services/api";

const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
const isRealStripeKey =
  publishableKey &&
  publishableKey.startsWith("pk_") &&
  !publishableKey.includes("PASTE_YOUR_KEY") &&
  !publishableKey.includes("your_publishable_key");

const stripePromise = isRealStripeKey ? loadStripe(publishableKey) : null;

function StripeForm({ booking, paymentIntentId, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError("");

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.post("/payments/confirm", {
        bookingId: booking.id,
        paymentIntentId,
      });
      onSuccess(res.data.booking);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Payment verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="booking-form">
      {error && <div className="alert alert-error">{error}</div>}
      <PaymentElement />
      <button
        type="submit"
        className="btn btn-primary btn-full btn-lg"
        disabled={!stripe || submitting}
      >
        {submitting
          ? "Processing..."
          : `Pay $${Number(booking.totalAmount).toFixed(2)}`}
      </button>
    </form>
  );
}

function DemoPayForm({ booking, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleDemoPay = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/payments/mock-confirm", { bookingId: booking.id });
      onSuccess(res.data.booking);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Payment failed.");
      setSubmitting(false);
    }
  };

  return (
    <div className="booking-form">
      {error && <div className="alert alert-error">{error}</div>}
      <div
        style={{
          padding: "1rem",
          background: "var(--bg-tint)",
          borderRadius: "var(--radius)",
          marginBottom: "1rem",
          fontSize: "0.9rem",
        }}
      >
        <strong>Demo Mode</strong>
        <p style={{ marginTop: "0.4rem" }}>
          Stripe is not configured. Clicking below will simulate a successful
          payment for testing.
        </p>
      </div>
      <button
        onClick={handleDemoPay}
        className="btn btn-primary btn-full btn-lg"
        disabled={submitting}
      >
        {submitting
          ? "Processing..."
          : `Complete Payment (Demo) — $${Number(booking.totalAmount).toFixed(2)}`}
      </button>
    </div>
  );
}

export default function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const bookingRes = await api.get(`/bookings/${bookingId}`);
        if (cancelled) return;
        const b = bookingRes.data.booking;
        setBooking(b);

        if (b.status === "CONFIRMED") {
          setConfirmed(b);
          return;
        }

        if (isRealStripeKey) {
          const intentRes = await api.post("/payments/create-intent", { bookingId });
          if (cancelled) return;
          setClientSecret(intentRes.data.clientSecret);
          setPaymentIntentId(intentRes.data.paymentIntentId);
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || "Could not load payment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [bookingId]);

  const options = useMemo(
    () => (clientSecret ? { clientSecret, appearance: { theme: "stripe" } } : null),
    [clientSecret]
  );

  if (loading) return <div className="loading">Loading payment...</div>;

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-outline" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="page">
        <div className="success-card">
          <h2>Payment Successful</h2>
          <p>Booking ID: <strong>{confirmed.id}</strong></p>
          {confirmed.invoice && (
            <p>Invoice: <strong>{confirmed.invoice.invoiceNumber}</strong></p>
          )}
          <p>Paid: <strong>${Number(confirmed.totalAmount).toFixed(2)}</strong></p>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Complete Payment</h1>
      <div className="booking-layout">
        <div className="booking-summary">
          <h3>Order Summary</h3>
          {booking?.items?.map((item, i) => (
            <div key={i} className="booking-item">
              {item.flight && (
                <span>
                  {item.flight.airlineName} {item.flight.flightNumber}:{" "}
                  {item.flight.departurePort} → {item.flight.arrivalPort}
                </span>
              )}
              {item.hotel && <span>{item.hotel.name} — {item.hotel.city}</span>}
              {item.package && <span>{item.package.packageName}</span>}
            </div>
          ))}
          <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid var(--border)" }} />
          <p><strong>Passengers:</strong> {booking?.numberOfPersons}</p>
          <p style={{ fontSize: "1.25rem", marginTop: "0.5rem" }}>
            <strong>Total: ${Number(booking?.totalAmount || 0).toFixed(2)}</strong>
          </p>
        </div>

        {isRealStripeKey && options ? (
          <Elements stripe={stripePromise} options={options}>
            <StripeForm
              booking={booking}
              paymentIntentId={paymentIntentId}
              onSuccess={(b) => setConfirmed(b)}
            />
          </Elements>
        ) : (
          <DemoPayForm booking={booking} onSuccess={(b) => setConfirmed(b)} />
        )}
      </div>
    </div>
  );
}
