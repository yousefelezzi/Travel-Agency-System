import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
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

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking? A 20% cancellation fee applies.")) return;

    setCancellingId(bookingId);
    try {
      const res = await api.post(`/bookings/${bookingId}/cancel`);
      alert(`Booking cancelled. Refund: $${res.data.refundAmount.toFixed(2)} (Fee: $${res.data.cancellationFee.toFixed(2)})`);
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.error?.message || "Cancel failed");
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusClass = (status) => {
    const map = { CONFIRMED: "status-confirmed", PENDING: "status-pending", CANCELLED: "status-cancelled", MODIFIED: "status-modified" };
    return map[status] || "";
  };

  return (
    <div className="page">
      <h1>My Dashboard</h1>
      <p className="subtitle">Welcome back, {user?.profile?.firstName || user?.email}</p>

      <h2>Booking History</h2>
      {loading ? <div className="loading">Loading bookings...</div> :
        bookings.length === 0 ? (
          <div className="empty-state">
            <h3>No bookings yet</h3>
            <p>Start by searching for flights, hotels, or packages.</p>
          </div>
        ) : (
          <div className="bookings-list">
            {bookings.map((b) => (
              <div key={b.id} className="booking-card">
                <div className="booking-header">
                  <div>
                    <span className={`status-badge ${getStatusClass(b.status)}`}>{b.status}</span>
                    <span className="booking-id">#{b.id.slice(0, 8)}</span>
                  </div>
                  <span className="booking-date">
                    {new Date(b.bookingDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="booking-items">
                  {b.items.map((item, i) => (
                    <div key={i} className="booking-item">
                      {item.flight && (
                        <span>{item.flight.airlineName} {item.flight.flightNumber}: {item.flight.departurePort} → {item.flight.arrivalPort}</span>
                      )}
                      {item.hotel && (
                        <span>{item.hotel.name} — {item.hotel.city}</span>
                      )}
                      {item.package && (
                        <span>{item.package.packageName}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="booking-footer">
                  <span className="booking-total">
                    Total: ${Number(b.totalAmount).toFixed(2)}
                    {b.invoice && <small> | Invoice: {b.invoice.invoiceNumber}</small>}
                  </span>
                  <div className="booking-actions">
                    {b.status === "CONFIRMED" && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancel(b.id)}
                        disabled={cancellingId === b.id}
                      >
                        {cancellingId === b.id ? "Cancelling..." : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
