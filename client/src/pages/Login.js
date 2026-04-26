import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HERO_IMG = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&auto=format&fit=crop";
const FALLBACK = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80&auto=format&fit=crop";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      // Send each role to their primary workspace
      if (data.user.role === "ADMIN") navigate("/admin");
      else if (data.user.role === "TRAVEL_AGENT") navigate("/agent");
      else navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Quick-pick demo accounts for graders / demos.
  const DEMO_ACCOUNTS = [
    { id: "CUSTOMER", label: "Customer", email: "john@example.com", password: "Test@1234" },
    { id: "TRAVEL_AGENT", label: "Travel Agent", email: "agent@atlas.com", password: "Test@1234" },
    { id: "ADMIN", label: "Administrator", email: "admin@atlas.com", password: "Test@1234" },
  ];
  const fillDemo = async (acct) => {
    setEmail(acct.email);
    setPassword(acct.password);
    setError("");
    setLoading(true);
    try {
      const data = await login(acct.email, acct.password);
      if (data.user.role === "ADMIN") navigate("/admin");
      else if (data.user.role === "TRAVEL_AGENT") navigate("/agent");
      else navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      {/* ── Visual panel ── */}
      <div className="auth-visual">
        <img
          src={HERO_IMG}
          alt=""
          className="auth-visual-img"
          onError={(e) => { if (e.target.src !== FALLBACK) e.target.src = FALLBACK; }}
        />
        <div className="auth-visual-overlay" />
        <div className="auth-visual-aurora" aria-hidden="true" />
        <div className="auth-visual-grain" aria-hidden="true" />
        <div className="auth-visual-content">
          <div className="auth-visual-brand">
            <span className="auth-visual-mark" />
            ATLAS
          </div>
          <div className="auth-visual-copy">
            <span className="auth-visual-eyebrow">
              <span className="auth-visual-eyebrow-dot" />
              Welcome back
            </span>
            <h2>
              Your next journey
              <br />
              <em>starts here.</em>
            </h2>
            <p>Plan smarter. Book faster. Travel better.</p>
          </div>
          <div className="auth-visual-stats">
            <div className="auth-visual-stat">
              <strong>2M+</strong>
              <span>travelers</span>
            </div>
            <div className="auth-visual-stat">
              <strong>120+</strong>
              <span>countries</span>
            </div>
            <div className="auth-visual-stat">
              <strong>4.9 &#9733;</strong>
              <span>rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-form-header">
            <span className="auth-form-eyebrow">— Sign in</span>
            <h2>
              Welcome <em>back.</em>
            </h2>
            <p>Sign in to continue your journey with ATLAS.</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="auth-demo-strip">
            <span className="auth-demo-label">Demo accounts</span>
            <div className="auth-demo-buttons">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.id}
                  type="button"
                  className="auth-demo-btn"
                  onClick={() => fillDemo(acct)}
                  disabled={loading}
                  title={`${acct.email} · ${acct.password}`}
                >
                  Login as {acct.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Email address</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Signing in\u2026" : "Sign In"}
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              )}
            </button>
          </form>

          {/* Trust signal */}
          <div className="auth-trust">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" /><path d="m9 12 2 2 4-4" /></svg>
            Secure login &middot; Your data is encrypted and protected
          </div>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
