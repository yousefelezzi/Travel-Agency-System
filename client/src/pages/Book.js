import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

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
  const [success, setSuccess] = useState(null);

  // Hotel-specific
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [seatClass, setSeatClass] = useState("economy");
  const [quantity, setQuantity] = useState(1);

  // Passengers
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
    setQuantity(passengers.length + 1);
  };

  const removePassenger = (index) => {
    if (passengers.length <= 1) return;
    setPassengers(passengers.filter((_, i) => i !== index));
    setQuantity(Math.max(1, passengers.length - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // Validate passengers
    for (const p of passengers) {
      if (!p.firstName || !p.lastName || !p.dateOfBirth) {
        setError("All passengers must have a first name, last name, and date of birth.");
        setSubmitting(false);
        return;
      }
    }

    const bookingItem = { type, id, quantity };
    if (type === "hotel") {
      if (!checkIn || !checkOut) {
        setError("Check-in and check-out dates are required for hotels.");
        setSubmitting(false);
        return;
      }
      bookingItem.checkIn = checkIn;
      bookingItem.checkOut = checkOut;
    }
    if (type === "flight") {
      bookingItem.seatClass = seatClass;
      bookingItem.quantity = passengers.length;
    }
    if (type === "package") {
      bookingItem.quantity = passengers.length;
    }

    try {
      const res = await api.post("/bookings", {
        items: [bookingItem],
        passengers,
      });
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error && !item) return <div className="page"><div className="alert alert-error">{error}</div></div>;

  if (success) {
    return (
      <div className="page">
        <div className="success-card">
          <h2>Booking Confirmed!</h2>
          <p>Booking ID: <strong>{success.booking.id}</strong></p>
          {success.booking.invoice && (
            <p>Invoice: <strong>{success.booking.invoice.invoiceNumber}</strong></p>
          )}
          <p>Total: <strong>${Number(success.booking.totalAmount).toFixed(2)}</strong></p>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </button>
            <button className="btn btn-outline" onClick={() => navigate("/flights")}>
              Book Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Complete Your Booking</h1>

      <div className="booking-layout">
        {/* Item Summary */}
        <div className="booking-summary">
          <h3>
            {type === "flight" && `${item.airlineName} - ${item.flightNumber}`}
            {type === "hotel" && item.name}
            {type === "package" && item.packageName}
          </h3>
          {type === "flight" && (
            <p>{item.departurePort} → {item.arrivalPort}</p>
          )}
          {type === "hotel" && <p>{item.city}, {item.country}</p>}
          {type === "package" && <p>{item.description}</p>}

          {type === "flight" && (
            <div className="form-group">
              <label>Seat Class</label>
              <select value={seatClass} onChange={(e) => setSeatClass(e.target.value)}>
                <option value="economy">Economy — ${Number(item.economyPrice).toFixed(0)}</option>
                {item.businessPrice && (
                  <option value="business">Business — ${Number(item.businessPrice).toFixed(0)}</option>
                )}
              </select>
            </div>
          )}

          {type === "hotel" && (
            <div className="form-row">
              <div className="form-group">
                <label>Check-in</label>
                <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Check-out</label>
                <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
              </div>
            </div>
          )}
        </div>

        {/* Passenger Form */}
        <form onSubmit={handleSubmit} className="booking-form">
          {error && <div className="alert alert-error">{error}</div>}

          <h3>Passenger Details</h3>
          {passengers.map((p, i) => (
            <div key={i} className="passenger-card">
              <div className="passenger-header">
                <h4>Passenger {i + 1}</h4>
                {passengers.length > 1 && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => removePassenger(i)}>
                    Remove
                  </button>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input value={p.firstName} onChange={(e) => updatePassenger(i, "firstName", e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input value={p.lastName} onChange={(e) => updatePassenger(i, "lastName", e.target.value)} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth *</label>
                  <input type="date" value={p.dateOfBirth} onChange={(e) => updatePassenger(i, "dateOfBirth", e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Passport Number</label>
                  <input value={p.passportNumber} onChange={(e) => updatePassenger(i, "passportNumber", e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Nationality</label>
                <input value={p.nationality} onChange={(e) => updatePassenger(i, "nationality", e.target.value)} />
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-outline" onClick={addPassenger}>
            + Add Passenger
          </button>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={submitting}>
            {submitting ? "Processing..." : "Confirm Booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
