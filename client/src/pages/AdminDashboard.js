import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

// ───────── Users tab (TC_046, TC_047) ─────────
function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    email: "",
    username: "",
    password: "",
    role: "TRAVEL_AGENT",
    firstName: "",
    lastName: "",
  });
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const params = {};
      if (q) params.q = q;
      if (role) params.role = role;
      const res = await api.get("/admin/users", { params });
      setUsers(res.data.users);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Couldn't load users.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const submitNew = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/admin/users", draft);
      setCreating(false);
      setDraft({
        email: "",
        username: "",
        password: "",
        role: "TRAVEL_AGENT",
        firstName: "",
        lastName: "",
      });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Couldn't create user.");
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.put(`/admin/users/${u.id}`, { isActive: !u.isActive });
      load();
    } catch (err) {
      alert(err.response?.data?.error?.message || "Couldn't update.");
    }
  };

  return (
    <div>
      <div className="ag-toolbar">
        <h2>Users & roles</h2>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + New staff
        </button>
      </div>

      <div className="ad-filter-row">
        <input
          type="text"
          className="ad-input"
          placeholder="Search by email or username…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="ag-select"
        >
          <option value="">All roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="TRAVEL_AGENT">Travel agents</option>
          <option value="ADMIN">Admins</option>
        </select>
        <button type="button" className="btn btn-outline" onClick={load}>
          Search
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="ad-user-list">
        {users.map((u) => {
          const profile = u.customer || u.employee;
          const name = profile
            ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
            : "—";
          return (
            <article key={u.id} className={`ad-user ${u.isActive ? "" : "is-inactive"}`}>
              <div className="ad-user-main">
                <div className="ad-user-name">{name || u.username}</div>
                <div className="ad-user-meta">{u.email}</div>
              </div>
              <span className={`ad-role-pill ad-role-pill--${u.role.toLowerCase()}`}>
                {u.role.replace("_", " ")}
              </span>
              <span className="ad-user-date">Joined {fmtDate(u.createdAt)}</span>
              <button
                type="button"
                className={`btn btn-sm ${u.isActive ? "btn-danger" : "btn-primary"}`}
                onClick={() => toggleActive(u)}
              >
                {u.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </article>
          );
        })}
        {users.length === 0 && (
          <div className="ag-empty">No users match this filter.</div>
        )}
      </div>

      {creating && (
        <div className="bd-modal-backdrop" onClick={() => setCreating(false)}>
          <div className="bd-modal ag-modal-wide" onClick={(e) => e.stopPropagation()}>
            <header className="bd-modal__head">
              <h3>Create staff account</h3>
              <button type="button" className="bd-modal__close" onClick={() => setCreating(false)}>×</button>
            </header>
            <form className="bd-modal__body ag-pkg-form" onSubmit={submitNew}>
              <div className="ag-pkg-row">
                <label>
                  <span>First name</span>
                  <input type="text" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} required />
                </label>
                <label>
                  <span>Last name</span>
                  <input type="text" value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} required />
                </label>
              </div>
              <label>
                <span>Email</span>
                <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} required />
              </label>
              <div className="ag-pkg-row">
                <label>
                  <span>Username</span>
                  <input type="text" value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} required />
                </label>
                <label>
                  <span>Initial password</span>
                  <input type="text" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} required />
                </label>
              </div>
              <label>
                <span>Role</span>
                <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
                  <option value="TRAVEL_AGENT">Travel agent</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </label>
              {error && <div className="alert alert-error">{error}</div>}
              <footer className="bd-modal__foot">
                <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── Reports tab (TC_048) ─────────
function ReportsPanel() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get("/admin/reports/summary", { params });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxRevenue = useMemo(() => {
    if (!data?.topDestinations?.length) return 0;
    return Math.max(...data.topDestinations.map((d) => d.revenue));
  }, [data]);

  return (
    <div>
      <div className="ag-toolbar">
        <h2>Sales & performance</h2>
        <div className="ad-date-row">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span>→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button type="button" className="btn btn-outline" onClick={load}>
            {loading ? "Loading…" : "Apply"}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="ad-kpi-grid">
            <div className="ad-kpi">
              <span>Total revenue</span>
              <strong>{fmtMoney(data.totals.totalRevenue)}</strong>
            </div>
            <div className="ad-kpi">
              <span>Bookings</span>
              <strong>{data.totals.bookingsCount}</strong>
            </div>
            <div className="ad-kpi">
              <span>Confirmed</span>
              <strong>{data.totals.confirmedCount}</strong>
            </div>
            <div className="ad-kpi">
              <span>Cancelled</span>
              <strong>{data.totals.cancelledCount}</strong>
            </div>
            <div className="ad-kpi">
              <span>Pending</span>
              <strong>{data.totals.pendingCount}</strong>
            </div>
          </div>

          <div className="ad-report-row">
            <section className="ad-report-card">
              <h3>Top destinations</h3>
              <div className="ad-bars">
                {data.topDestinations.length === 0 && (
                  <p className="ag-empty">No bookings yet for this range.</p>
                )}
                {data.topDestinations.map((d) => (
                  <div key={d.destination} className="ad-bar-row">
                    <span className="ad-bar-label">{d.destination}</span>
                    <div className="ad-bar-track">
                      <div
                        className="ad-bar-fill"
                        style={{ width: `${maxRevenue ? (d.revenue / maxRevenue) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="ad-bar-value">{fmtMoney(d.revenue)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="ad-report-card">
              <h3>Bookings by category</h3>
              <ul className="ad-cat-list">
                <li>
                  <span>Flights</span>
                  <strong>{data.bookingsByCategory.flight}</strong>
                </li>
                <li>
                  <span>Hotels</span>
                  <strong>{data.bookingsByCategory.hotel}</strong>
                </li>
                <li>
                  <span>Packages</span>
                  <strong>{data.bookingsByCategory.package}</strong>
                </li>
              </ul>

              <h3 style={{ marginTop: "1.5rem" }}>Users by role</h3>
              <ul className="ad-cat-list">
                {Object.entries(data.usersByRole || {}).map(([role, count]) => (
                  <li key={role}>
                    <span>{role.replace("_", " ")}</span>
                    <strong>{count}</strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {data.monthlyRevenue?.length > 0 && (
            <section className="ad-report-card" style={{ marginTop: "1rem" }}>
              <h3>Monthly revenue</h3>
              <div className="ad-bars">
                {data.monthlyRevenue.map((m) => {
                  const max = Math.max(...data.monthlyRevenue.map((x) => x.revenue));
                  return (
                    <div key={m.month} className="ad-bar-row">
                      <span className="ad-bar-label">{m.month}</span>
                      <div className="ad-bar-track">
                        <div
                          className="ad-bar-fill ad-bar-fill--alt"
                          style={{ width: `${max ? (m.revenue / max) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="ad-bar-value">{fmtMoney(m.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ───────── Cancellation policy tab (TC_049) ─────────
function PolicyPanel() {
  const [policy, setPolicy] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api
      .get("/admin/config/cancellation-policy")
      .then((res) => {
        setPolicy(res.data.policy);
        setDraft(res.data.policy);
      });
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await api.put("/admin/config/cancellation-policy", draft);
      setPolicy(res.data.policy);
      setMsg("Policy updated. Future cancellations will use the new fees.");
    } catch (err) {
      setMsg(err.response?.data?.error?.message || "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  if (!draft) return <div className="ag-empty">Loading policy…</div>;

  return (
    <div className="ad-policy">
      <h2>Cancellation policy</h2>
      <p className="ad-policy-help">
        Defines the fee schedule used by every customer cancellation. Changes take effect on the next cancellation.
      </p>
      <div className="ad-policy-grid">
        <label>
          <span>Early-tier window (days)</span>
          <input
            type="number"
            min="0"
            value={draft.earlyTierDays}
            onChange={(e) => setDraft({ ...draft, earlyTierDays: Number(e.target.value) })}
          />
          <small>Cancellations beyond this many days from departure use the early fee.</small>
        </label>
        <label>
          <span>Early fee (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={draft.earlyFeePercent}
            onChange={(e) => setDraft({ ...draft, earlyFeePercent: Number(e.target.value) })}
          />
        </label>
        <label>
          <span>Late fee (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={draft.lateFeePercent}
            onChange={(e) => setDraft({ ...draft, lateFeePercent: Number(e.target.value) })}
          />
          <small>Applies inside the early-tier window.</small>
        </label>
        <label>
          <span>Pending booking fee (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={draft.pendingFeePercent}
            onChange={(e) => setDraft({ ...draft, pendingFeePercent: Number(e.target.value) })}
          />
          <small>For bookings cancelled before payment.</small>
        </label>
      </div>
      {msg && <div className="alert alert-info">{msg}</div>}
      <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save policy"}
      </button>
    </div>
  );
}

// ───────── Job listings tab (TC_050) ─────────
function JobsPanel() {
  const [jobs, setJobs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({
    title: "",
    department: "",
    description: "",
    qualifications: "",
    workHours: "",
    compensation: "",
    isPublished: false,
  });
  const [applications, setApplications] = useState([]);
  const [showApps, setShowApps] = useState(null); // jobId or null
  const [error, setError] = useState("");

  const load = async () => {
    const res = await api.get("/admin/jobs");
    setJobs(res.data.jobs);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => {
    setEditing("new");
    setDraft({
      title: "",
      department: "",
      description: "",
      qualifications: "",
      workHours: "",
      compensation: "",
      isPublished: false,
    });
    setError("");
  };
  const startEdit = (j) => {
    setEditing(j);
    setDraft({
      title: j.title,
      department: j.department,
      description: j.description,
      qualifications: j.qualifications || "",
      workHours: j.workHours || "",
      compensation: j.compensation || "",
      isPublished: j.isPublished,
    });
    setError("");
  };
  const close = () => setEditing(null);
  const save = async () => {
    try {
      if (editing === "new") await api.post("/admin/jobs", draft);
      else await api.put(`/admin/jobs/${editing.id}`, draft);
      close();
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Couldn't save.");
    }
  };
  const togglePublish = async (j) => {
    await api.put(`/admin/jobs/${j.id}`, { isPublished: !j.isPublished });
    load();
  };
  const remove = async (j) => {
    if (!window.confirm(`Delete "${j.title}"?`)) return;
    await api.delete(`/admin/jobs/${j.id}`);
    load();
  };
  const openApps = async (j) => {
    setShowApps(j.id);
    const res = await api.get("/admin/applications", { params: { jobId: j.id } });
    setApplications(res.data.applications);
  };

  return (
    <div>
      <div className="ag-toolbar">
        <h2>Job listings</h2>
        <button type="button" className="btn btn-primary" onClick={startNew}>
          + New posting
        </button>
      </div>

      <div className="ag-pkg-list">
        {jobs.map((j) => (
          <article key={j.id} className="ag-pkg">
            <div className="ag-pkg-head">
              <div>
                <h3>{j.title}</h3>
                <span className="ag-pkg-meta">
                  {j.department}
                  {j.compensation ? ` · ${j.compensation}` : ""}
                  {" · "}
                  {j._count?.applications || 0} application{(j._count?.applications || 0) === 1 ? "" : "s"}
                </span>
              </div>
              <span className={`ag-pkg-status ${j.isPublished ? "is-live" : "is-draft"}`}>
                {j.isPublished ? "Live" : "Draft"}
              </span>
            </div>
            <p className="ag-pkg-desc">{j.description}</p>
            <div className="ag-pkg-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(j)}>Edit</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => togglePublish(j)}>
                {j.isPublished ? "Unpublish" : "Publish"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => openApps(j)}>
                View applicants
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(j)}>Delete</button>
            </div>
          </article>
        ))}
        {jobs.length === 0 && <div className="ag-empty">No job listings yet.</div>}
      </div>

      {editing && (
        <div className="bd-modal-backdrop" onClick={close}>
          <div className="bd-modal ag-modal-wide" onClick={(e) => e.stopPropagation()}>
            <header className="bd-modal__head">
              <h3>{editing === "new" ? "New job posting" : "Edit posting"}</h3>
              <button type="button" className="bd-modal__close" onClick={close}>×</button>
            </header>
            <div className="bd-modal__body ag-pkg-form">
              <label>
                <span>Title</span>
                <input type="text" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </label>
              <div className="ag-pkg-row">
                <label>
                  <span>Department</span>
                  <input type="text" value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} />
                </label>
                <label>
                  <span>Compensation</span>
                  <input type="text" placeholder="e.g. $2,500/month" value={draft.compensation} onChange={(e) => setDraft({ ...draft, compensation: e.target.value })} />
                </label>
              </div>
              <label>
                <span>Description</span>
                <textarea rows={4} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </label>
              <label>
                <span>Qualifications</span>
                <textarea rows={3} value={draft.qualifications} onChange={(e) => setDraft({ ...draft, qualifications: e.target.value })} />
              </label>
              <label>
                <span>Work hours</span>
                <input type="text" placeholder="e.g. Mon–Fri, 9am–6pm" value={draft.workHours} onChange={(e) => setDraft({ ...draft, workHours: e.target.value })} />
              </label>
              <label className="ag-pkg-publish">
                <input type="checkbox" checked={draft.isPublished} onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })} />
                <span>Publish to careers portal</span>
              </label>
              {error && <div className="alert alert-error">{error}</div>}
            </div>
            <footer className="bd-modal__foot">
              <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={save}>Save</button>
            </footer>
          </div>
        </div>
      )}

      {showApps && (
        <div className="bd-modal-backdrop" onClick={() => setShowApps(null)}>
          <div className="bd-modal ag-modal-wide" onClick={(e) => e.stopPropagation()}>
            <header className="bd-modal__head">
              <h3>Applicants</h3>
              <button type="button" className="bd-modal__close" onClick={() => setShowApps(null)}>×</button>
            </header>
            <div className="bd-modal__body">
              {applications.length === 0 ? (
                <p className="bd-modal__muted">No applications yet.</p>
              ) : (
                applications.map((a) => (
                  <div key={a.id} className="ad-applicant">
                    <strong>{a.applicantName}</strong>
                    <span>{a.email}{a.phone ? ` · ${a.phone}` : ""}</span>
                    {a.coverLetter && <p>{a.coverLetter}</p>}
                    <small>Applied {fmtDate(a.createdAt)}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── Provider credentials tab (TC_051 + provider mgmt) ─────────
function ProvidersPanel() {
  const [providers, setProviders] = useState([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", contactEmail: "", type: "AIRLINE" });
  const [issuedKey, setIssuedKey] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await api.get("/admin/providers");
    setProviders(res.data.providers);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/admin/providers", draft);
      setIssuedKey({ name: res.data.provider.name, apiKey: res.data.provider.apiKey });
      setCreating(false);
      setDraft({ name: "", contactEmail: "", type: "AIRLINE" });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Couldn't create.");
    }
  };

  const rotate = async (p) => {
    if (!window.confirm(`Rotate API key for ${p.name}? Their old key will stop working immediately.`)) return;
    const res = await api.post(`/admin/providers/${p.id}/rotate-key`);
    setIssuedKey({ name: res.data.provider.name, apiKey: res.data.provider.apiKey });
    load();
  };

  const toggleActive = async (p) => {
    await api.put(`/admin/providers/${p.id}`, { isActive: !p.isActive });
    load();
  };

  return (
    <div>
      <div className="ag-toolbar">
        <h2>Service providers & API keys</h2>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + New provider
        </button>
      </div>

      {issuedKey && (
        <div className="ad-key-banner">
          <strong>API key issued for {issuedKey.name}.</strong>
          <p>Copy this now — it won't be shown again.</p>
          <code>{issuedKey.apiKey}</code>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setIssuedKey(null)}>Dismiss</button>
        </div>
      )}

      <div className="ag-pkg-list">
        {providers.map((p) => (
          <article key={p.id} className={`ag-pkg ${p.isActive ? "" : "is-inactive"}`}>
            <div className="ag-pkg-head">
              <div>
                <h3>{p.name}</h3>
                <span className="ag-pkg-meta">
                  {p.type.replace("_", " ")} · {p.contactEmail} · key {p.apiKeyMasked}
                </span>
              </div>
              <span className={`ag-pkg-status ${p.isActive ? "is-live" : "is-draft"}`}>
                {p.isActive ? "Active" : "Disabled"}
              </span>
            </div>
            <div className="ag-pkg-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => rotate(p)}>Rotate API key</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleActive(p)}>
                {p.isActive ? "Disable" : "Enable"}
              </button>
              <span className="ad-pkg-stat">
                {p._count?.inventoryLogs || 0} inventory submission{(p._count?.inventoryLogs || 0) === 1 ? "" : "s"}
              </span>
            </div>
          </article>
        ))}
        {providers.length === 0 && <div className="ag-empty">No providers configured yet.</div>}
      </div>

      {creating && (
        <div className="bd-modal-backdrop" onClick={() => setCreating(false)}>
          <div className="bd-modal ag-modal-wide" onClick={(e) => e.stopPropagation()}>
            <header className="bd-modal__head">
              <h3>New service provider</h3>
              <button type="button" className="bd-modal__close" onClick={() => setCreating(false)}>×</button>
            </header>
            <form className="bd-modal__body ag-pkg-form" onSubmit={create}>
              <label>
                <span>Provider name</span>
                <input type="text" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Middle East Airlines" />
                <small>Must match the airline / hotel / package name in inventory.</small>
              </label>
              <label>
                <span>Contact email</span>
                <input type="email" required value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} />
                <small>Booking notifications go here.</small>
              </label>
              <label>
                <span>Type</span>
                <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                  <option value="AIRLINE">Airline</option>
                  <option value="HOTEL">Hotel</option>
                  <option value="TOUR_OPERATOR">Tour operator</option>
                </select>
              </label>
              {error && <div className="alert alert-error">{error}</div>}
              <footer className="bd-modal__foot">
                <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create + issue key</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── Bookings tab (admin booking management — Process Flow page 33) ─────────
const STATUS_TONES = {
  PENDING: "warning",
  CONFIRMED: "success",
  MODIFIED: "info",
  CANCELLED: "muted",
};

function BookingsPanel() {
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(null); // booking object | null
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/bookings/admin/all", { params });
      setBookings(res.data.bookings);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Couldn't load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const openCancel = async (b) => {
    setCancelling(b);
    setQuote(null);
    setError("");
    setQuoteLoading(true);
    try {
      const res = await api.get(`/bookings/${b.id}/cancellation-quote`);
      setQuote(res.data.quote);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Couldn't load quote.");
    } finally {
      setQuoteLoading(false);
    }
  };

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await api.post(`/bookings/${cancelling.id}/cancel`);
      setCancelling(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Cancel failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="ag-toolbar">
        <h2>All bookings</h2>
        <select
          className="ag-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="MODIFIED">Modified</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="ag-empty">Loading bookings…</div>
      ) : bookings.length === 0 ? (
        <div className="ag-empty">No bookings match this filter.</div>
      ) : (
        <div className="ad-booking-list">
          {bookings.map((b) => {
            const customer = b.customer;
            const item = b.items?.[0];
            const label =
              item?.flight
                ? `${item.flight.departurePort} → ${item.flight.arrivalPort}`
                : item?.hotel
                ? item.hotel.name
                : item?.package?.packageName || "Trip";
            return (
              <article key={b.id} className="ad-booking">
                <div className="ad-booking-main">
                  <div className="ad-booking-id">#{b.id.slice(0, 8).toUpperCase()}</div>
                  <div className="ad-booking-label">{label}</div>
                  <div className="ad-booking-meta">
                    {customer?.firstName} {customer?.lastName}
                    {customer?.user?.email ? ` · ${customer.user.email}` : ""}
                    {" · "}
                    Booked {fmtDate(b.bookingDate)}
                  </div>
                </div>
                <span className={`sup-ticket-status sup-ticket-status--${STATUS_TONES[b.status] || "muted"}`}>
                  {b.status.toLowerCase()}
                </span>
                <div className="ad-booking-total">
                  <span>Total</span>
                  <strong>{fmtMoney(Number(b.totalAmount) - Number(b.discount || 0))}</strong>
                </div>
                <div className="ad-booking-actions">
                  {b.status !== "CANCELLED" && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => openCancel(b)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {cancelling && (
        <div className="bd-modal-backdrop" onClick={() => !busy && setCancelling(null)}>
          <div className="bd-modal" onClick={(e) => e.stopPropagation()}>
            <header className="bd-modal__head">
              <h3>Cancel booking #{cancelling.id.slice(0, 8).toUpperCase()}?</h3>
              <button type="button" className="bd-modal__close" onClick={() => setCancelling(null)}>×</button>
            </header>
            <div className="bd-modal__body">
              {quoteLoading ? (
                <p className="bd-modal__muted">Calculating fee…</p>
              ) : quote ? (
                <>
                  <div className="bd-modal__row">
                    <span>Booking total</span>
                    <strong>{fmtMoney(cancelling.totalAmount)}</strong>
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
                  <p className="bd-modal__muted">
                    The customer will receive a cancellation email and refund.
                  </p>
                </>
              ) : null}
            </div>
            <footer className="bd-modal__foot">
              <button type="button" className="btn btn-ghost" onClick={() => setCancelling(null)} disabled={busy}>
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

// ───────── Page shell ─────────
export default function AdminDashboard() {
  const [tab, setTab] = useState("users");

  return (
    <div className="ag-page">
      <div className="ag-page__inner">
        <header className="ag-page__head">
          <span className="ag-eyebrow">— Administrator</span>
          <h1>Admin console</h1>
          <p>Users, bookings, sales reports, system policies, careers portal, and provider integrations.</p>
        </header>

        <div className="ag-tabs">
          {[
            ["users", "Users & roles"],
            ["bookings", "Bookings"],
            ["reports", "Reports"],
            ["policy", "Cancellation policy"],
            ["jobs", "Job listings"],
            ["providers", "Providers & API keys"],
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

        {tab === "users" && <UsersPanel />}
        {tab === "bookings" && <BookingsPanel />}
        {tab === "reports" && <ReportsPanel />}
        {tab === "policy" && <PolicyPanel />}
        {tab === "jobs" && <JobsPanel />}
        {tab === "providers" && <ProvidersPanel />}
      </div>
    </div>
  );
}
