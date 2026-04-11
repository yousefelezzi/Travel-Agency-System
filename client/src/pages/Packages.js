import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const res = await api.get("/packages", { params });
      setPackages(res.data.packages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPackages(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="page">
      <h1>Tour Packages</h1>
      <form className="search-bar" onSubmit={(e) => { e.preventDefault(); fetchPackages(); }}>
        <input placeholder="Search packages..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {loading ? <div className="loading">Loading packages...</div> :
        packages.length === 0 ? (
          <div className="empty-state"><h3>No packages available</h3></div>
        ) : (
          <div className="results-grid">
            {packages.map((p) => (
              <div key={p.id} className="card">
                <div className="card-header">
                  <span className="package-name">{p.packageName}</span>
                  {Number(p.discount) > 0 && <span className="badge badge-discount">{Number(p.discount)}% OFF</span>}
                </div>
                <div className="card-body">
                  <p className="description">{p.description}</p>
                  <div className="services-list">
                    {p.services?.map((s, i) => <span key={i} className="service-tag">{s}</span>)}
                  </div>
                </div>
                <div className="card-footer">
                  <div className="price-group">
                    {Number(p.discount) > 0 && (
                      <span className="price-original">${Number(p.price).toFixed(0)}</span>
                    )}
                    <span className="price">
                      ${(Number(p.price) * (1 - Number(p.discount) / 100)).toFixed(0)}
                    </span>
                    <small>/person</small>
                  </div>
                  <button className="btn btn-primary"
                    onClick={() => navigate(`/book?type=package&id=${p.id}`)}>
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
