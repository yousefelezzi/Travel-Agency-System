import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const TICKET_STATUS_TONES = {
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
const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

// ─── Tickets tab ──────────────────────────────────────────────────────
function TicketsPanel() {
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTicket, setActiveTicket] = useState(null);
  const [resolutionDraft, setResolutionDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/support/tickets/admin", { params });
      setTickets(res.data.tickets);
    } catch {
      setError("Couldn't load tickets.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const open = (t) => {
    setActiveTicket(t);
    setResolutionDraft(t.resolution || "");
    setError("");
  };

  const close = () => {
    setActiveTicket(null);
    setResolutionDraft("");
    setError("");
  };

  const resolve = async (status) => {
    if (!resolutionDraft.trim()) {
      setError("Add a resolution note before saving.");
      return;
    }
    setBusy(true);
    try {
      await api.put(`/support/tickets/${activeTicket.id}/resolve`, {
        resolution: resolutionDraft.trim(),
        status,
      });
      close();
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Couldn't update ticket.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="ag-toolbar">
        <h2>Support tickets</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="ag-select"
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {tickets.length === 0 ? (
        <div className="ag-empty">No tickets match this filter.</div>
      ) : (
        <div className="ag-ticket-list">
          {tickets.map((t) => (
            <article
              key={t.id}
              className="ag-ticket"
              onClick={() => open(t)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") open(t);
              }}
            >
              <header>
                <span className={`ag-ticket-status ag-ticket-status--${TICKET_STATUS_TONES[t.status] || "muted"}`}>
                  {t.status.replace("_", " ")}
                </span>
                <span className="ag-ticket-cat">{t.category.replace("_", " ")}</span>
                <span className="ag-ticket-date">{fmtDate(t.createdAt)}</span>
              </header>
              <h3>{t.subject}</h3>
              <p className="ag-ticket-meta">
                {t.customer?.firstName} {t.customer?.lastName}
                {t.customer?.user?.email ? ` · ${t.customer.user.email}` : ""}
              </p>
            </article>
          ))}
        </div>
      )}

      {activeTicket && (
        <div className="bd-modal-backdrop" onClick={close}>
          <div className="bd-modal ag-modal-wide" onClick={(e) => e.stopPropagation()}>
            <header className="bd-modal__head">
              <h3>{activeTicket.subject}</h3>
              <button type="button" className="bd-modal__close" onClick={close}>×</button>
            </header>
            <div className="bd-modal__body">
              <div className="ag-ticket-meta-block">
                <div>
                  <strong>Reference:</strong> {activeTicket.id.slice(0, 8).toUpperCase()}
                </div>
                <div>
                  <strong>Category:</strong> {activeTicket.category.replace("_", " ")}
                </div>
                <div>
                  <strong>Customer:</strong> {activeTicket.customer?.firstName} {activeTicket.customer?.lastName} ({activeTicket.customer?.user?.email})
                </div>
                <div>
                  <strong>Opened:</strong> {fmtDate(activeTicket.createdAt)}
                </div>
                <div>
                  <strong>Status:</strong> {activeTicket.status.replace("_", " ")}
                </div>
              </div>

              <div className="ag-ticket-section">
                <strong>What the customer said</strong>
                <p>{activeTicket.description}</p>
              </div>

              <label className="ag-resolution-label">
                Resolution note
                <textarea
                  rows={5}
                  value={resolutionDraft}
                  onChange={(e) => setResolutionDraft(e.target.value)}
                  placeholder="What did you do? The customer will be notified."
                />
              </label>
              {error && <div className="alert alert-error">{error}</div>}
            </div>
            <footer className="bd-modal__foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => resolve("IN_PROGRESS")}
                disabled={busy}
              >
                Save as in progress
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => resolve("RESOLVED")}
                disabled={busy}
              >
                {busy ? "Saving…" : "Mark resolved"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Packages tab ─────────────────────────────────────────────────────
const EMPTY_PKG = {
  packageName: "",
  description: "",
  services: "",
  price: "",
  discount: 0,
  isPublished: false,
  startDate: "",
  endDate: "",
};

function PackagesPanel() {
  const [packages, setPackages] = useState([]);
  const [editing, setEditing] = useState(null); // package object | "new" | null
  const [draft, setDraft] = useState(EMPTY_PKG);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      // Use the public endpoint with high limit (admin browsing).
      const res = await api.get("/packages", { params: { limit: 100 } });
      setPackages(res.data.packages || []);
    } catch {
      setError("Couldn't load packages.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing("new");
    setDraft(EMPTY_PKG);
    setError("");
  };

  const startEdit = (p) => {
    setEditing(p);
    setDraft({
      packageName: p.packageName || "",
      description: p.description || "",
      services: (p.services || []).join("\n"),
      price: p.price || "",
      discount: p.discount || 0,
      isPublished: p.isPublished,
      startDate: p.startDate ? p.startDate.slice(0, 10) : "",
      endDate: p.endDate ? p.endDate.slice(0, 10) : "",
    });
    setError("");
  };

  const close = () => {
    setEditing(null);
    setError("");
  };

  const save = async () => {
    if (!draft.packageName.trim() || !draft.price) {
      setError("Name and price are required.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        packageName: draft.packageName.trim(),
        description: draft.description.trim() || null,
        services: draft.services
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        price: Number(draft.price),
        discount: Number(draft.discount) || 0,
        isPublished: !!draft.isPublished,
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
      };
      if (editing === "new") {
        await api.post("/packages", payload);
      } else {
        await api.put(`/packages/${editing.id}`, payload);
      }
      close();
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Couldn't save package.");
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async (p) => {
    try {
      await api.put(`/packages/${p.id}`, {
        ...p,
        services: p.services || [],
        isPublished: !p.isPublished,
      });
      load();
    } catch {
      // ignore — user can retry
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.packageName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/packages/${p.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error?.message || "Couldn't delete.");
    }
  };

  return (
    <div>
      <div className="ag-toolbar">
        <h2>Tour packages</h2>
        <button type="button" className="btn btn-primary" onClick={startNew}>
          + New package
        </button>
      </div>

      {error && !editing && <div className="alert alert-error">{error}</div>}

      <div className="ag-pkg-list">
        {packages.map((p) => (
          <article key={p.id} className="ag-pkg">
            <div className="ag-pkg-head">
              <div>
                <h3>{p.packageName}</h3>
                <span className="ag-pkg-meta">
                  {fmtMoney(p.price)}{p.discount > 0 ? ` · ${p.discount}% off` : ""}
                </span>
              </div>
              <span className={`ag-pkg-status ${p.isPublished ? "is-live" : "is-draft"}`}>
                {p.isPublished ? "Live" : "Draft"}
              </span>
            </div>
            {p.description && <p className="ag-pkg-desc">{p.description}</p>}
            <div className="ag-pkg-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(p)}>
                Edit
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => togglePublish(p)}>
                {p.isPublished ? "Unpublish" : "Publish"}
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(p)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <div className="bd-modal-backdrop" onClick={() => !busy && close()}>
          <div className="bd-modal ag-modal-wide" onClick={(e) => e.stopPropagation()}>
            <header className="bd-modal__head">
              <h3>{editing === "new" ? "New package" : "Edit package"}</h3>
              <button type="button" className="bd-modal__close" onClick={close}>×</button>
            </header>
            <div className="bd-modal__body ag-pkg-form">
              <label>
                <span>Name</span>
                <input
                  type="text"
                  value={draft.packageName}
                  onChange={(e) => setDraft({ ...draft, packageName: e.target.value })}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </label>
              <label>
                <span>Services (one per line)</span>
                <textarea
                  rows={4}
                  value={draft.services}
                  placeholder={"Round-trip flight\n5-night hotel\nAirport transfer"}
                  onChange={(e) => setDraft({ ...draft, services: e.target.value })}
                />
              </label>
              <div className="ag-pkg-row">
                <label>
                  <span>Price (USD)</span>
                  <input
                    type="number"
                    min="0"
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                  />
                </label>
                <label>
                  <span>Discount (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={draft.discount}
                    onChange={(e) => setDraft({ ...draft, discount: e.target.value })}
                  />
                </label>
              </div>
              <div className="ag-pkg-row">
                <label>
                  <span>Available from</span>
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                  />
                </label>
                <label>
                  <span>Available until</span>
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                  />
                </label>
              </div>
              <label className="ag-pkg-publish">
                <input
                  type="checkbox"
                  checked={draft.isPublished}
                  onChange={(e) =>
                    setDraft({ ...draft, isPublished: e.target.checked })
                  }
                />
                <span>Publish to customers</span>
              </label>
              {error && <div className="alert alert-error">{error}</div>}
            </div>
            <footer className="bd-modal__foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={close}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={save}
                disabled={busy}
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Customers tab (TC_045 — book on behalf + UR8 customer profile drill-in) ──
const STATUS_TONES_AG = {
  PENDING: "warning",
  CONFIRMED: "success",
  MODIFIED: "info",
  CANCELLED: "muted",
};

function CustomersPanel() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Drill-in state
  const [openCustomer, setOpenCustomer] = useState(null);
  const [openBookings, setOpenBookings] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState("");

  // Cancellation modal state (nested within the drill-in modal)
  const [cancelTarget, setCancelTarget] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/customers", { params: { q, limit: 30 } });
      setCustomers(res.data.customers);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startBooking = (customer) => {
    try {
      sessionStorage.setItem(
        "atlas_book_on_behalf",
        JSON.stringify({
          customerId: customer.id,
          name: `${customer.firstName} ${customer.lastName}`.trim(),
          email: customer.user?.email,
        })
      );
    } catch {
      // ignore
    }
    navigate("/flights");
  };

  const openProfile = async (c) => {
    setOpenCustomer(c);
    setOpenBookings([]);
    setDrillError("");
    setDrillLoading(true);
    try {
      const res = await api.get(`/admin/customers/${c.id}/bookings`);
      setOpenBookings(res.data.bookings);
    } catch (err) {
      setDrillError(err.response?.data?.error?.message || "Couldn't load bookings.");
    } finally {
      setDrillLoading(false);
    }
  };

  const closeDrill = () => {
    setOpenCustomer(null);
    setOpenBookings([]);
    setCancelTarget(null);
    setQuote(null);
  };

  const refreshDrill = async () => {
    if (!openCustomer) return;
    const res = await api.get(`/admin/customers/${openCustomer.id}/bookings`);
    setOpenBookings(res.data.bookings);
  };

  const startCancel = async (b) => {
    setCancelTarget(b);
    setQuote(null);
    setQuoteLoading(true);
    try {
      const res = await api.get(`/bookings/${b.id}/cancellation-quote`);
      setQuote(res.data.quote);
    } catch (err) {
      setDrillError(err.response?.data?.error?.message || "Couldn't load quote.");
      setCancelTarget(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await api.post(`/bookings/${cancelTarget.id}/cancel`);
      setCancelTarget(null);
      refreshDrill();
    } catch (err) {
      setDrillError(err.response?.data?.error?.message || "Cancel failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="ag-toolbar">
        <h2>Customers</h2>
        <div className="ad-filter-row" style={{ marginBottom: 0 }}>
          <input
            type="text"
            className="ad-input"
            placeholder="Search by name, email, or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <button type="button" className="btn btn-outline" onClick={load}>
            {loading ? "Loading…" : "Search"}
          </button>
        </div>
      </div>

      <p className="ag-customers-help">
        Click a customer to view their full booking history. Use "Book on behalf →" to start a new booking under their account.
      </p>

      <div className="ag-customer-list">
        {customers.map((c) => (
          <article key={c.id} className="ag-customer">
            <button
              type="button"
              className="ag-customer-open"
              onClick={() => openProfile(c)}
            >
              <span className="ag-customer-name">
                {c.firstName} {c.lastName}
              </span>
              <span className="ag-customer-meta">
                {c.user?.email}
                {c.phone ? ` · ${c.phone}` : ""}
                {c.city ? ` · ${c.city}` : ""}
              </span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => startBooking(c)}
            >
              Book on behalf →
            </button>
          </article>
        ))}
        {customers.length === 0 && (
          <div className="ag-empty">No customers match this search.</div>
        )}
      </div>

      {/* ── Customer drill-in modal ── */}
      {openCustomer && (
        <div className="bd-modal-backdrop" onClick={closeDrill}>
          <div className="bd-modal ag-modal-wide" onClick={(e) => e.stopPropagation()}>
            <header className="bd-modal__head">
              <div>
                <h3>{openCustomer.firstName} {openCustomer.lastName}</h3>
                <small className="ag-customer-meta">{openCustomer.user?.email}</small>
              </div>
              <button type="button" className="bd-modal__close" onClick={closeDrill}>×</button>
            </header>
            <div className="bd-modal__body">
              <div className="ag-customer-summary">
                <div><strong>Phone:</strong> {openCustomer.phone || "—"}</div>
                <div><strong>City:</strong> {openCustomer.city || "—"}</div>
                <div><strong>Bookings:</strong> {drillLoading ? "…" : openBookings.length}</div>
              </div>

              <div className="ag-customer-actions-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => startBooking(openCustomer)}
                >
                  Book on behalf →
                </button>
              </div>

              {drillError && <div className="alert alert-error">{drillError}</div>}

              <h4 className="ag-customer-history-h">Booking history</h4>
              {drillLoading ? (
                <p className="bd-modal__muted">Loading bookings…</p>
              ) : openBookings.length === 0 ? (
                <p className="bd-modal__muted">No bookings yet.</p>
              ) : (
                <div className="ag-customer-bookings">
                  {openBookings.map((b) => {
                    const item = b.items?.[0];
                    const label = item?.flight
                      ? `${item.flight.departurePort} → ${item.flight.arrivalPort}`
                      : item?.hotel?.name || item?.package?.packageName || "Trip";
                    return (
                      <article key={b.id} className="ag-customer-booking">
                        <div>
                          <div className="ag-customer-booking-label">{label}</div>
                          <div className="ag-customer-booking-meta">
                            #{b.id.slice(0, 8).toUpperCase()} · {fmtDate(b.bookingDate)}
                          </div>
                        </div>
                        <span className={`sup-ticket-status sup-ticket-status--${STATUS_TONES_AG[b.status] || "muted"}`}>
                          {b.status.toLowerCase()}
                        </span>
                        <strong>{fmtMoney(Number(b.totalAmount) - Number(b.discount || 0))}</strong>
                        {b.status !== "CANCELLED" && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => startCancel(b)}
                          >
                            Cancel
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Nested cancel confirmation ── */}
      {cancelTarget && (
        <div className="bd-modal-backdrop" onClick={() => !busy && setCancelTarget(null)}>
          <div className="bd-modal" onClick={(e) => e.stopPropagation()}>
            <header className="bd-modal__head">
              <h3>Cancel booking #{cancelTarget.id.slice(0, 8).toUpperCase()}?</h3>
              <button type="button" className="bd-modal__close" onClick={() => setCancelTarget(null)}>×</button>
            </header>
            <div className="bd-modal__body">
              {quoteLoading ? (
                <p className="bd-modal__muted">Calculating fee…</p>
              ) : quote ? (
                <>
                  <div className="bd-modal__row">
                    <span>Booking total</span>
                    <strong>{fmtMoney(cancelTarget.totalAmount)}</strong>
                  </div>
                  <div className="bd-modal__row bd-modal__row--fee">
                    <span>Cancellation fee ({quote.feePercent}%)</span>
                    <strong>− {fmtMoney(quote.feeAmount)}</strong>
                  </div>
                  <div className="bd-modal__divider" />
                  <div className="bd-modal__row bd-modal__row--total">
                    <span>Refund to customer</span>
                    <strong>{fmtMoney(quote.refundAmount)}</strong>
                  </div>
                  {quote.reason && <p className="bd-modal__reason">{quote.reason}</p>}
                </>
              ) : null}
            </div>
            <footer className="bd-modal__foot">
              <button type="button" className="btn btn-ghost" onClick={() => setCancelTarget(null)} disabled={busy}>
                Keep booking
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmCancel} disabled={busy || quoteLoading}>
                {busy ? "Cancelling…" : "Yes, cancel"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────
export default function AgentDashboard() {
  const [tab, setTab] = useState("tickets");

  return (
    <div className="ag-page">
      <div className="ag-page__inner">
        <header className="ag-page__head">
          <span className="ag-eyebrow">— Travel Agent</span>
          <h1>Agent workspace</h1>
          <p>Resolve customer tickets, manage tour packages, and book on behalf of customers.</p>
        </header>

        <div className="ag-tabs">
          {[
            ["tickets", "Support tickets"],
            ["packages", "Packages"],
            ["customers", "Customers"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`ag-tab ${tab === id ? "is-active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "tickets" && <TicketsPanel />}
        {tab === "packages" && <PackagesPanel />}
        {tab === "customers" && <CustomersPanel />}
      </div>
    </div>
  );
}
