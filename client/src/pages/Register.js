import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HERO_IMG = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80&auto=format&fit=crop";
const FALLBACK = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&auto=format&fit=crop";

export default function Register() {
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",
    accountType: "INDIVIDUAL",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Registration failed");
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
            TAS
          </div>
          <div className="auth-visual-copy">
            <span className="auth-visual-eyebrow">
              <span className="auth-visual-eyebrow-dot" />
              Join TAS today
            </span>
            <h2>
              Plan smarter.
              <br />
              <em>Travel better.</em>
            </h2>
            <p>Join 2M+ travelers booking with confidence.</p>
          </div>
          <div className="auth-visual-stats">
            <div className="auth-visual-stat">
              <strong>850+</strong>
              <span>airlines</span>
            </div>
            <div className="auth-visual-stat">
              <strong>45K+</strong>
              <span>hotels</span>
            </div>
            <div className="auth-visual-stat">
              <strong>200+</strong>
              <span>packages</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner auth-form-inner-wide">
          <div className="auth-form-header">
            <span className="auth-form-eyebrow">— Create account</span>
            <h2>
              Create your <em>TAS account.</em>
            </h2>
            <p>Start planning smarter trips in minutes.</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-row">
              <div className="auth-field">
                <label>First name</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="John" required />
                </div>
              </div>
              <div className="auth-field">
                <label>Last name</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Doe" required />
                </div>
              </div>
            </div>

            <div className="auth-row">
              <div className="auth-field">
                <label>Email address</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
                </div>
              </div>
              <div className="auth-field">
                <label>Username</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" /></svg>
                  <input name="username" value={form.username} onChange={handleChange} placeholder="johndoe" required />
                </div>
              </div>
            </div>

            <div className="auth-row">
              <div className="auth-field">
                <label>Password</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min. 8 characters" required />
                </div>
              </div>
              <div className="auth-field">
                <label>Confirm password</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat password" required />
                </div>
              </div>
            </div>

            <div className="auth-row">
              <div className="auth-field">
                <label>Date of birth</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} required />
                </div>
              </div>
              <div className="auth-field">
                <label>Phone <span className="auth-optional">(optional)</span></label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 234 567 890" />
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label>Account type</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                <select name="accountType" value={form.accountType} onChange={handleChange}>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="GROUP">Group / Family</option>
                </select>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Creating account\u2026" : "Create Account"}
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              )}
            </button>
          </form>

          <div className="auth-trust">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" /><path d="m9 12 2 2 4-4" /></svg>
            Your data is encrypted &middot; PCI-compliant &middot; GDPR-ready
          </div>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
