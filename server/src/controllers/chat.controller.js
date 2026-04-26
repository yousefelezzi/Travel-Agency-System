const { client, isConfigured } = require("../config/anthropic");

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `You are an ATLAS travel concierge — a real-feeling expert for the ATLAS Travel Agency System. Your job is to help travelers plan and book trips.

Tone: warm, confident, concise. Speak like a friend who happens to know travel inside out. Avoid corporate filler.

Capabilities you can talk about:
- Destination recommendations (warm/cold, beach/city/nature/adventure, family/couple/solo)
- Budget-aware suggestions (under $500, $500-$1000, $1000-$3000, $3000+)
- Trip duration trade-offs
- Quick itinerary ideas (3-5 lines max unless asked for more)
- Pointing users to ATLAS features:
  * "Take the Travel Quiz" at /quiz when they're undecided
  * "Build My Trip" at /build when they have rough intent
  * "AI Planner" at /planner when they want a full crafted plan with real flights/hotels
  * "Browse Packages" at /packages

Rules:
- Keep replies under 4 short paragraphs unless asked for more.
- Don't hallucinate prices, flight numbers, or specific bookings.
- If asked about a booking issue, gently route to: contact concierge@atlas.com.
- When the user shows trip intent (destination + dates or vibe), suggest using /planner or /build for next steps.
- No emojis unless the user uses them first.`;

const FALLBACK_REPLIES = [
  "Hi — happy to help. Could you tell me a bit more about the trip you're thinking about? Where, when, and who's going?",
  "Got it. A few quick options to get moving: take our Travel Quiz at /quiz if you're undecided, use Build My Trip at /build if you have an idea, or jump into the AI Planner at /planner for a full plan.",
  "I can't run the full concierge brain right now, but I can point you in the right direction. What kind of trip are you in the mood for — relaxation, adventure, culture, or something else?",
];

const pickFallback = (history) => {
  const turn = (history || []).filter((m) => m.role === "user").length;
  return FALLBACK_REPLIES[Math.min(turn, FALLBACK_REPLIES.length - 1)];
};

// POST /api/chat
const chat = async (req, res, next) => {
  try {
    const { messages = [], context = "" } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ error: { message: "messages array required" } });
    }

    // Sanitize and clamp
    const cleaned = messages
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
      )
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, 2000),
      }));

    if (cleaned.length === 0) {
      return res
        .status(400)
        .json({ error: { message: "no usable messages" } });
    }

    if (!isConfigured) {
      return res.json({
        reply: pickFallback(cleaned),
        fallback: true,
      });
    }

    const systemBlocks = [SYSTEM_PROMPT];
    if (context && typeof context === "string") {
      systemBlocks.push(`Traveler context: ${context.slice(0, 500)}`);
    }

    const result = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: systemBlocks.join("\n\n"),
      messages: cleaned,
    });

    const text =
      result?.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim() || pickFallback(cleaned);

    res.json({ reply: text });
  } catch (error) {
    console.error("[chat] error", error?.message);
    res.json({
      reply:
        "I'm having trouble reaching the concierge right now. In the meantime — try the AI Planner at /planner or take the Travel Quiz at /quiz.",
      fallback: true,
    });
  }
};

module.exports = { chat };
