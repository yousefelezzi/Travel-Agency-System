import { useEffect, useRef, useState } from "react";

const QUICK_ACTIONS = [
  { id: "cheaper", label: "Make it cheaper", text: "Make it cheaper without losing the vibe." },
  { id: "luxury", label: "Upgrade to luxury", text: "Upgrade everything to luxury — better hotel and cabin." },
  { id: "nightlife", label: "Add nightlife", text: "Add nightlife and evening activities to the plan." },
  { id: "relax", label: "Make it more relaxing", text: "Slow it down — more relaxation, fewer activities each day." },
  { id: "shorter", label: "Shorten trip", text: "Make the trip shorter by 1–2 days." },
  { id: "longer", label: "Extend trip", text: "Extend the trip by an extra day." },
  { id: "swap", label: "Change destination", text: "Suggest a similar destination with the same vibe." },
];

const SEED_MESSAGE = {
  role: "assistant",
  content:
    "I've drafted your plan. Use the quick actions or tell me what to tune — I'll update the plan above, not just talk about it.",
};

export default function PlannerChat({ onRefine, currentDestination }) {
  const [messages, setMessages] = useState([SEED_MESSAGE]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    try {
      const change = await onRefine(text, messages.slice(-4));
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            change ||
            "Done — I tweaked the plan above. Want another adjustment?",
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "I couldn't apply that change. Try rephrasing, or pick a quick action below.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    send();
  };

  return (
    <aside className="pl-chat" aria-label="Refine your trip">
      <header className="pl-chat-head">
        <div>
          <div className="pl-chat-title">Refine your trip</div>
          <div className="pl-chat-sub">
            {currentDestination
              ? `Working on ${currentDestination}`
              : "Working on your plan"}
          </div>
        </div>
        <span className="pl-chat-status">
          <span className="pl-chat-dot" />
          live
        </span>
      </header>

      <div className="pl-chat-body" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`pl-chat-msg pl-chat-msg-${m.role}`}>
            <div className="pl-chat-bubble">{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="pl-chat-msg pl-chat-msg-assistant">
            <div className="pl-chat-bubble pl-chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      <div className="pl-chat-quick">
        {QUICK_ACTIONS.map((q) => (
          <button
            key={q.id}
            type="button"
            className="pl-chat-quick-chip"
            onClick={() => send(q.text)}
            disabled={busy}
          >
            {q.label}
          </button>
        ))}
      </div>

      <form className="pl-chat-input-row" onSubmit={submit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Or type a custom tweak…"
          disabled={busy}
          maxLength={500}
          className="pl-chat-input"
        />
        <button
          type="submit"
          className="pl-chat-send"
          disabled={busy || !input.trim()}
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </aside>
  );
}
