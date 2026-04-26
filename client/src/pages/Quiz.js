import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { emptyQuiz, loadQuiz, saveQuiz } from "../utils/preferences";

const STEPS = [
  {
    id: "vibe",
    multi: true,
    minSelection: 1,
    title: "What's your travel vibe?",
    sub: "Pick one or more — we'll weight your matches around it.",
    options: [
      { id: "relaxation", label: "Relaxation", hint: "Slow mornings, no rush" },
      { id: "adventure", label: "Adventure", hint: "Trails, water, altitude" },
      { id: "culture", label: "Culture", hint: "Museums, history, locals" },
      { id: "luxury", label: "Luxury", hint: "Suites, fine dining, spa" },
      { id: "party", label: "Party", hint: "Late nights, big energy" },
      { id: "nature", label: "Nature", hint: "Mountains, jungle, sea" },
    ],
  },
  {
    id: "budget",
    multi: false,
    title: "What's your budget per person?",
    sub: "Used to filter out trips that don't make sense for you.",
    options: [
      { id: "under-500", label: "Under $500" },
      { id: "500-1000", label: "$500 – $1,000" },
      { id: "1000-3000", label: "$1,000 – $3,000" },
      { id: "3000+", label: "$3,000+" },
    ],
  },
  {
    id: "duration",
    multi: false,
    title: "How long is the trip?",
    sub: "We'll suggest destinations that work at this pace.",
    options: [
      { id: "weekend", label: "Weekend" },
      { id: "3-5", label: "3 – 5 days" },
      { id: "1-week", label: "1 week" },
      { id: "2-weeks", label: "2+ weeks" },
    ],
  },
  {
    id: "groupType",
    multi: false,
    title: "Who are you traveling with?",
    sub: "Group dynamics change the right destination.",
    options: [
      { id: "solo", label: "Solo" },
      { id: "couple", label: "Couple" },
      { id: "friends", label: "Friends" },
      { id: "family", label: "Family" },
    ],
  },
  {
    id: "climate",
    multi: false,
    title: "Preferred climate?",
    sub: "Pick what you'd actually pack for.",
    options: [
      { id: "warm", label: "Warm" },
      { id: "cold", label: "Cold" },
      { id: "any", label: "Doesn't matter" },
    ],
  },
  {
    id: "activities",
    multi: true,
    minSelection: 1,
    title: "What do you want to do there?",
    sub: "Pick a few — we'll prioritize destinations built for them.",
    options: [
      { id: "beaches", label: "Beaches" },
      { id: "hiking", label: "Hiking" },
      { id: "food", label: "Food" },
      { id: "nightlife", label: "Nightlife" },
      { id: "history", label: "History" },
      { id: "shopping", label: "Shopping" },
    ],
  },
  {
    id: "region",
    multi: false,
    title: "Any region preference?",
    sub: "We'll lean toward this — but won't lock you out of great matches elsewhere.",
    options: [
      { id: "europe", label: "Europe" },
      { id: "asia", label: "Asia" },
      { id: "middle-east", label: "Middle East" },
      { id: "africa", label: "Africa" },
      { id: "americas", label: "Americas" },
      { id: "oceania", label: "Oceania" },
      { id: "anywhere", label: "Anywhere" },
    ],
  },
];

export default function Quiz() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(emptyQuiz());

  useEffect(() => {
    const existing = loadQuiz();
    if (existing) setAnswers((a) => ({ ...a, ...existing }));
  }, []);

  const current = STEPS[step];
  const total = STEPS.length;
  const progressPct = Math.round(((step + 1) / total) * 100);

  const value = answers[current.id];
  const isAnswered = current.multi
    ? Array.isArray(value) && value.length >= (current.minSelection || 1)
    : !!value;

  const select = (optId) => {
    setAnswers((prev) => {
      if (current.multi) {
        const list = prev[current.id] || [];
        const next = list.includes(optId)
          ? list.filter((x) => x !== optId)
          : [...list, optId];
        return { ...prev, [current.id]: next };
      }
      return { ...prev, [current.id]: optId };
    });
  };

  const next = () => {
    if (!isAnswered) return;
    if (step < total - 1) {
      setStep(step + 1);
      return;
    }
    saveQuiz(answers);
    navigate("/quiz/results");
  };

  const back = () => {
    if (step === 0) {
      navigate("/");
      return;
    }
    setStep(step - 1);
  };

  const isSelected = (optId) =>
    current.multi
      ? (value || []).includes(optId)
      : value === optId;

  const optionGrid = useMemo(() => {
    const cols = current.options.length > 4 ? 3 : 2;
    return { gridTemplateColumns: `repeat(${cols}, 1fr)` };
  }, [current]);

  return (
    <div className="quiz-page">
      <div className="quiz-bg" aria-hidden="true">
        <div className="quiz-bg-blob quiz-bg-blob-a" />
        <div className="quiz-bg-blob quiz-bg-blob-b" />
      </div>

      <div className="quiz-shell">
        <header className="quiz-head">
          <button type="button" className="quiz-back" onClick={back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {step === 0 ? "Exit" : "Back"}
          </button>
          <div className="quiz-progress" aria-label={`Step ${step + 1} of ${total}`}>
            <div className="quiz-progress-bar" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="quiz-step-count">
            {String(step + 1).padStart(2, "0")} <em>/</em> {String(total).padStart(2, "0")}
          </span>
        </header>

        <div className="quiz-content">
          <div className="quiz-text">
            <span className="quiz-eyebrow">— Travel Quiz</span>
            <h1>{current.title}</h1>
            <p>{current.sub}</p>
          </div>

          <div className="quiz-options" style={optionGrid}>
            {current.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`quiz-option ${isSelected(opt.id) ? "is-selected" : ""}`}
                onClick={() => select(opt.id)}
                aria-pressed={isSelected(opt.id)}
              >
                <span className="quiz-option-label">{opt.label}</span>
                {opt.hint && <span className="quiz-option-hint">{opt.hint}</span>}
                {isSelected(opt.id) && (
                  <span className="quiz-option-check" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>

          {current.multi && (
            <div className="quiz-multi-hint">Pick as many as fit you.</div>
          )}
        </div>

        <footer className="quiz-foot">
          <button
            type="button"
            className="btn-cta btn-cta-quiz-next"
            onClick={next}
            disabled={!isAnswered}
          >
            {step < total - 1 ? "Continue" : "See my matches"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </footer>
      </div>
    </div>
  );
}
