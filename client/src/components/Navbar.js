import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">
          <span className="nav-logomark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
          </span>
          TAS
          <span className="nav-brand-sub">Travel</span>
        </Link>
      </div>
      <div className="nav-links">
        <Link to="/flights">Flights</Link>
        <Link to="/hotels">Hotels</Link>
        <Link to="/packages">Packages</Link>
        {user && <Link to="/planner" className="nav-planner">AI Planner</Link>}
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            {(user.role === "ADMIN" || user.role === "TRAVEL_AGENT") && (
              <Link to="/admin">Admin</Link>
            )}
            <button onClick={handleLogout} className="btn btn-outline">
              Logout
            </button>
            <span className="nav-user">{user.email}</span>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline">
              Login
            </Link>
            <Link to="/register" className="btn btn-accent">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
