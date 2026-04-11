import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Flights() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    date: "",
    maxPrice: "",
    passengers: "1",
  });
  const [pagination, setPagination] = useState({});
  const navigate = useNavigate();

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

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="page">
      <h1>Search Flights</h1>
      <form className="search-bar" onSubmit={handleSearch}>
        <input
          placeholder="From (e.g. Beirut)"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <input
          placeholder="To (e.g. Dubai)"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
        <input
          type="date"
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
        />
        <input
          type="number"
          placeholder="Max price"
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
        />
        <input
          type="number"
          min="1"
          placeholder="Passengers"
          value={filters.passengers}
          onChange={(e) => setFilters({ ...filters, passengers: e.target.value })}
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {loading ? (
        <div className="loading">Searching flights...</div>
      ) : flights.length === 0 ? (
        <div className="empty-state">
          <h3>No flights found</h3>
          <p>Try different dates or destinations.</p>
        </div>
      ) : (
        <>
          <div className="results-grid">
            {flights.map((f) => (
              <div key={f.id} className="card">
                <div className="card-header">
                  <span className="airline">{f.airlineName}</span>
                  <span className="flight-number">{f.flightNumber}</span>
                </div>
                <div className="card-body">
                  <div className="route">
                    <div>
                      <strong>{f.departurePort}</strong>
                      <small>{formatDate(f.departureDate)}</small>
                    </div>
                    <span className="arrow">→</span>
                    <div>
                      <strong>{f.arrivalPort}</strong>
                      <small>{formatDate(f.arrivalDate)}</small>
                    </div>
                  </div>
                  <div className="card-details">
                    <span>Aircraft: {f.aircraftType || "N/A"}</span>
                    <span>{f.availableSeats} seats left</span>
                  </div>
                </div>
                <div className="card-footer">
                  <span className="price">${Number(f.economyPrice).toFixed(0)}</span>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/book?type=flight&id=${f.id}`)}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
          {pagination.totalPages > 1 && (
            <div className="pagination">
              {Array.from({ length: pagination.totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`btn ${pagination.page === i + 1 ? "btn-primary" : "btn-outline"}`}
                  onClick={() => search(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
