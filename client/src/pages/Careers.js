import { useEffect, useState } from "react";
import api from "../services/api";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function Careers() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeJob, setActiveJob] = useState(null);
  const [draft, setDraft] = useState({
    applicantName: "",
    email: "",
    phone: "",
    coverLetter: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api
      .get("/jobs")
      .then((res) => setJobs(res.data.jobs))
      .catch(() => setError("Couldn't load job listings."))
      .finally(() => setLoading(false));
  }, []);

  const apply = async (e) => {
    e.preventDefault();
    if (!draft.applicantName.trim() || !draft.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api.post(`/jobs/${activeJob.id}/apply`, draft);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Couldn't submit.");
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    setActiveJob(null);
    setSubmitted(false);
    setDraft({ applicantName: "", email: "", phone: "", coverLetter: "" });
    setError("");
  };

  return (
    <div className="careers-page">
      <div className="careers-shell">
        <header className="careers-hero">
          <span className="careers-eyebrow">— Careers at ATLAS</span>
          <h1>Help us build the future of travel.</h1>
          <p>
            We're a small, ambitious team building a digital travel ecosystem
            from scratch. Pick a role and tell us why you'd be a fit.
          </p>
        </header>

        {error && !activeJob && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p className="ag-empty">Loading openings…</p>
        ) : jobs.length === 0 ? (
          <div className="ag-empty">
            No open positions right now. Check back soon.
          </div>
        ) : (
          <div className="careers-list">
            {jobs.map((j) => (
              <article key={j.id} className="careers-job">
                <div className="careers-job-head">
                  <div>
                    <h2>{j.title}</h2>
                    <span className="careers-job-meta">
                      {j.department}
                      {j.workHours ? ` · ${j.workHours}` : ""}
                      {j.compensation ? ` · ${j.compensation}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setActiveJob(j)}
                  >
                    Apply
                  </button>
                </div>
                <p>{j.description}</p>
                {j.qualifications && (
                  <div className="careers-quals">
                    <strong>Qualifications</strong>
                    <p>{j.qualifications}</p>
                  </div>
                )}
                <small className="careers-job-date">
                  Posted {fmtDate(j.createdAt)}
                </small>
              </article>
            ))}
          </div>
        )}
      </div>

      {activeJob && (
        <div className="bd-modal-backdrop" onClick={close}>
          <div className="bd-modal ag-modal-wide" onClick={(e) => e.stopPropagation()}>
            <header className="bd-modal__head">
              <h3>Apply — {activeJob.title}</h3>
              <button type="button" className="bd-modal__close" onClick={close}>×</button>
            </header>
            {submitted ? (
              <div className="bd-modal__body">
                <div className="sup-confirm">
                  <h3>Application received.</h3>
                  <p>Thanks for applying. We review every application personally and will be in touch soon.</p>
                  <div className="sup-confirm-actions">
                    <button type="button" className="btn btn-primary" onClick={close}>Done</button>
                  </div>
                </div>
              </div>
            ) : (
              <form className="bd-modal__body ag-pkg-form" onSubmit={apply}>
                <label>
                  <span>Full name</span>
                  <input type="text" required value={draft.applicantName} onChange={(e) => setDraft({ ...draft, applicantName: e.target.value })} />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" required value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                </label>
                <label>
                  <span>Phone (optional)</span>
                  <input type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                </label>
                <label>
                  <span>Why you?</span>
                  <textarea rows={5} placeholder="A few sentences on why you'd be great in this role." value={draft.coverLetter} onChange={(e) => setDraft({ ...draft, coverLetter: e.target.value })} />
                </label>
                {error && <div className="alert alert-error">{error}</div>}
                <footer className="bd-modal__foot">
                  <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Sending…" : "Submit application"}
                  </button>
                </footer>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
