import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const STATUS_TONE = {
  OPEN: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  CLOSED: "muted",
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function Support() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [view, setView] = useState("browse"); // "browse" | "form" | "mine"
  const [form, setForm] = useState({ subject: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    api
      .get("/support/categories")
      .then((res) => setCategories(res.data.categories))
      .catch(() => setError("Couldn't load support categories."));
  }, []);

  const loadMyTickets = () => {
    if (!user) return;
    api
      .get("/support/tickets/my")
      .then((res) => setTickets(res.data.tickets))
      .catch(() => {});
  };

  useEffect(() => {
    if (view === "mine") loadMyTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === activeCategoryId) || null,
    [categories, activeCategoryId]
  );

  const startTicket = (categoryId) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setActiveCategoryId(categoryId);
    setForm({ subject: "", description: "" });
    setError("");
    setConfirmation(null);
    setView("form");
  };

  const submitTicket = async (e) => {
    e.preventDefault();
    if (!activeCategoryId) return;
    if (!form.subject.trim() || !form.description.trim()) {
      setError("Both subject and description are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/support/tickets", {
        category: activeCategoryId,
        subject: form.subject.trim(),
        description: form.description.trim(),
      });
      setConfirmation(res.data.ticket);
      setForm({ subject: "", description: "" });
    } catch (err) {
      setError(err.response?.data?.error?.message || "Couldn't submit ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sup-page">
      <div className="sup-page__bg" aria-hidden />
      <div className="sup-page__inner">
        <header className="sup-hero">
          <span className="sup-hero__eyebrow">— Customer support</span>
          <h1>How can we help?</h1>
          <p>
            Pick a topic to find an answer, or open a ticket and a real person
            will get back to you.
          </p>
          {user && user.role === "CUSTOMER" && (
            <div className="sup-tabs">
              <button
                type="button"
                className={`sup-tab ${view !== "mine" ? "is-active" : ""}`}
                onClick={() => setView("browse")}
              >
                Browse help
              </button>
              <button
                type="button"
                className={`sup-tab ${view === "mine" ? "is-active" : ""}`}
                onClick={() => setView("mine")}
              >
                My tickets
              </button>
            </div>
          )}
        </header>

        {error && view !== "form" && (
          <div className="alert alert-error">{error}</div>
        )}

        {/* ─── BROWSE: categories + FAQs ─── */}
        {view === "browse" && (
          <>
            <section className="sup-categories">
              {categories.map((cat) => (
                <article
                  key={cat.id}
                  className={`sup-cat ${activeCategoryId === cat.id ? "is-active" : ""}`}
                  onClick={() => setActiveCategoryId(cat.id)}
                >
                  <h3>{cat.label}</h3>
                  <p>{cat.description}</p>
                  <span className="sup-cat-count">
                    {cat.faqs.length} FAQ{cat.faqs.length === 1 ? "" : "s"}
                  </span>
                </article>
              ))}
            </section>

            {activeCategory && (
              <section className="sup-faqs">
                <h2>{activeCategory.label} — FAQs</h2>
                <div className="sup-faq-list">
                  {activeCategory.faqs.map((faq, i) => (
                    <details key={i} className="sup-faq">
                      <summary>{faq.q}</summary>
                      <p>{faq.a}</p>
                    </details>
                  ))}
                </div>
                <div className="sup-faq-cta">
                  <strong>Still need help?</strong>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => startTicket(activeCategory.id)}
                  >
                    Open a ticket
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {/* ─── FORM: open ticket ─── */}
        {view === "form" && activeCategory && (
          <section className="sup-form-shell">
            <button
              type="button"
              className="sup-back"
              onClick={() => {
                setView("browse");
                setConfirmation(null);
              }}
            >
              ← Back to help
            </button>
            <h2>New ticket — {activeCategory.label}</h2>

            {confirmation ? (
              <div className="sup-confirm">
                <h3>Ticket received.</h3>
                <p>
                  Reference: <strong>{confirmation.id.slice(0, 8).toUpperCase()}</strong>
                </p>
                <p>
                  We'll respond by email. You can also track the status under
                  "My tickets".
                </p>
                <div className="sup-confirm-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setView("mine")}
                  >
                    View my tickets
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setConfirmation(null);
                      setView("browse");
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form className="sup-form" onSubmit={submitTicket}>
                <label>
                  <span>Subject</span>
                  <input
                    type="text"
                    value={form.subject}
                    maxLength={200}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Short summary of the issue"
                  />
                </label>
                <label>
                  <span>Describe what happened</span>
                  <textarea
                    value={form.description}
                    maxLength={5000}
                    rows={6}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Booking ID, dates, what went wrong, what you'd like us to do…"
                  />
                </label>
                {error && <div className="alert alert-error">{error}</div>}
                <div className="sup-form-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setView("browse")}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Sending…" : "Submit ticket"}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* ─── MINE: my tickets ─── */}
        {view === "mine" && (
          <section className="sup-mine">
            <h2>My tickets</h2>
            {tickets.length === 0 ? (
              <div className="sup-empty">
                <p>You haven't opened any support tickets yet.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setView("browse")}
                >
                  Browse help
                </button>
              </div>
            ) : (
              <div className="sup-mine-list">
                {tickets.map((t) => (
                  <article key={t.id} className="sup-ticket">
                    <header>
                      <span className={`sup-ticket-status sup-ticket-status--${STATUS_TONE[t.status] || "muted"}`}>
                        {t.status.replace("_", " ")}
                      </span>
                      <span className="sup-ticket-cat">{t.category.replace("_", " ")}</span>
                      <span className="sup-ticket-date">{fmtDate(t.createdAt)}</span>
                    </header>
                    <h3>{t.subject}</h3>
                    <p className="sup-ticket-desc">{t.description}</p>
                    {t.resolution && (
                      <div className="sup-ticket-res">
                        <strong>Resolution</strong>
                        <p>{t.resolution}</p>
                      </div>
                    )}
                    <div className="sup-ticket-id">
                      Ref: <code>{t.id.slice(0, 8).toUpperCase()}</code>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
