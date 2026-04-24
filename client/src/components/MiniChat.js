import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { loadQuiz } from "../utils/preferences";
import { buildPlannerContext } from "../utils/recommend";

const QUICK_PROMPTS = [
  "I want a warm beach trip for a couple",
  "Best 1-week Europe trip under $2000?",
  "Surprise me — what's a great March destination?",
];

const GREETING = {
  role: "assistant",
  content:
    "Hi — I'm your ATLAS travel concierge. Tell me what kind of trip you're after, or ask anything about destinations, budgets, or itineraries.",
};

export default function MiniChat({ open, onClose }) {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Focus input on open
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    const userMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const quiz = loadQuiz();
      const context = quiz ? buildPlannerContext(quiz) : "";
      const res = await api.post("/chat", {
        messages: next.filter((m) => m.role !== "system"),
        context,
      });
      const reply = res.data?.reply || "Hmm, I lost my train of thought. Try again?";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I can't reach the concierge right now. Try the AI Planner at /planner or take the Travel Quiz at /quiz.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send();
  };

  if (!open) return null;

  const showQuickPrompts = messages.length === 1 && !sending;

  return (
    <>
      <div className="mc-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="mc-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Travel concierge chat"
      >
        <header className="mc-head">
          <div className="mc-head-id">
            <div className="mc-avatar" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <div>
              <div className="mc-title">Travel concierge</div>
              <div className="mc-status">
                <span className="mc-status-dot" />
                Online · usually replies in seconds
              </div>
            </div>
          </div>
          <button
            type="button"
            className="mc-close"
            onClick={onClose}
            aria-label="Close chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="mc-body" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`mc-msg mc-msg-${m.role}`}>
              <div className="mc-bubble">{m.content}</div>
            </div>
          ))}
          {sending && (
            <div className="mc-msg mc-msg-assistant">
              <div className="mc-bubble mc-bubble-typing">
                <span /><span /><span />
              </div>
            </div>
          )}
        </div>

        {showQuickPrompts && (
          <div className="mc-quick">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                className="mc-quick-chip"
                onClick={() => send(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <form className="mc-input-row" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your next trip…"
            disabled={sending}
            maxLength={1000}
            className="mc-input"
          />
          <button
            type="submit"
            className="mc-send"
            disabled={sending || !input.trim()}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </form>
      </aside>
    </>
  );
}
