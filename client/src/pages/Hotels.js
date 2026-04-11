import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ city: "", maxPrice: "", minRating: "" });
  const navigate = useNavigate();

  const search = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filters.city) params.city = filters.city;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.minRating) params.minRating = filters.minRating;
      const res = await api.get("/hotels", { params });
      setHotels(res.data.hotels);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { search(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="page">
      <h1>Search Hotels</h1>
      <form className="search-bar" onSubmit={(e) => { e.preventDefault(); search(); }}>
        <input placeholder="City (e.g. Dubai)" value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
        <input type="number" placeholder="Max price/night" value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} />
        <select value={filters.minRating}
          onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}>
          <option value="">Any rating</option>
          <option value="3">3+ stars</option>
          <option value="4">4+ stars</option>
          <option value="5">5 stars</option>
        </select>
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {loading ? <div className="loading">Searching hotels...</div> :
        hotels.length === 0 ? (
          <div className="empty-state"><h3>No hotels found</h3><p>Try a different city or price range.</p></div>
        ) : (
          <div className="results-grid">
            {hotels.map((h) => (
              <div key={h.id} className="card">
                <div className="card-header">
                  <span className="hotel-name">{h.name}</span>
                  <span className="stars">{"★".repeat(h.starRating || 0)}</span>
                </div>
                <div className="card-body">
                  <p className="location">{h.city}, {h.country}</p>
                  <p className="description">{h.description}</p>
                  <span>{h.availableRooms} rooms available</span>
                </div>
                <div className="card-footer">
                  <span className="price">${Number(h.pricePerNight).toFixed(0)}<small>/night</small></span>
                  <button className="btn btn-primary"
                    onClick={() => navigate(`/book?type=hotel&id=${h.id}`)}>
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
