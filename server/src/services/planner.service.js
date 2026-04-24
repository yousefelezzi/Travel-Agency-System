const prisma = require("../config/db");
const { client, isConfigured } = require("../config/anthropic");

const MODEL = "claude-sonnet-4-5";
const MAX_CANDIDATES = 6;

async function findCandidates({ destination, startDate, endDate, travelers, budget }) {
  const destLike = destination
    ? { contains: destination, mode: "insensitive" }
    : undefined;

  const [flights, hotels, packages] = await Promise.all([
    prisma.flight.findMany({
      where: {
        availableSeats: { gte: travelers || 1 },
        ...(startDate && { departureDate: { gte: new Date(startDate) } }),
        ...(destLike && { arrivalPort: destLike }),
      },
      orderBy: { departureDate: "asc" },
      take: MAX_CANDIDATES,
    }),
    prisma.hotel.findMany({
      where: {
        availableRooms: { gte: 1 },
        ...(destination && {
          OR: [
            { city: destLike },
            { country: destLike },
          ],
        }),
      },
      orderBy: { pricePerNight: "asc" },
      take: MAX_CANDIDATES,
    }),
    prisma.package.findMany({
      where: {
        isPublished: true,
        ...(destination && {
          OR: [
            { packageName: destLike },
            { description: destLike },
          ],
        }),
      },
      orderBy: { price: "asc" },
      take: MAX_CANDIDATES,
    }),
  ]);

  return { flights, hotels, packages };
}

function trimForPrompt(candidates) {
  return {
    flights: candidates.flights.map((f) => ({
      id: f.id,
      airline: f.airlineName,
      flightNumber: f.flightNumber,
      from: f.departurePort,
      to: f.arrivalPort,
      departure: f.departureDate,
      arrival: f.arrivalDate,
      economyPrice: Number(f.economyPrice),
      businessPrice: f.businessPrice ? Number(f.businessPrice) : null,
    })),
    hotels: candidates.hotels.map((h) => ({
      id: h.id,
      name: h.name,
      city: h.city,
      country: h.country,
      starRating: h.starRating,
      pricePerNight: Number(h.pricePerNight),
    })),
    packages: candidates.packages.map((p) => ({
      id: p.id,
      name: p.packageName,
      description: p.description,
      price: Number(p.price),
      discount: Number(p.discount || 0),
    })),
  };
}

async function generateWithClaude(prefs, candidates) {
  const days = computeDays(prefs.startDate, prefs.endDate);

  const contextLine = prefs.context
    ? `\nAdditional context from the traveler's profile / quiz:\n${prefs.context}\n`
    : "";

  const prompt = `You are a premium travel planner for ATLAS (Travel Agency System).

Plan a trip using ONLY the real options below. Pick the single best flight and hotel (and optionally a package) that match the traveler's preferences. Then create a concise day-by-day itinerary.
${contextLine}
Traveler preferences:
${JSON.stringify(prefs, null, 2)}

Available options:
${JSON.stringify(candidates, null, 2)}

Return ONLY valid JSON matching this schema — no prose, no code fences:
{
  "summary": "2-3 sentence pitch of the trip",
  "chosenFlightId": "<id or null>",
  "chosenHotelId": "<id or null>",
  "chosenPackageId": "<id or null>",
  "rationale": "1-2 sentences explaining why you picked these",
  "days": [
    { "day": 1, "title": "Arrival & Explore", "activities": ["...", "..."] }
  ],
  "estimatedTotal": <number, total estimated cost in USD for the chosen items>
}

Trip length: ${days} day(s). Produce exactly ${days} day entries. Activities should be specific and evocative (neighborhoods, local dishes, landmarks). Pick IDs only from the options above; use null if none fit.`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.content.find((b) => b.type === "text")?.text || "";
  return extractJson(text);
}

function extractJson(text) {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object in Claude response.");
  }
  return JSON.parse(text.slice(firstBrace, lastBrace + 1));
}

function computeDays(start, end) {
  if (!start || !end) return 3;
  const d = Math.ceil((new Date(end) - new Date(start)) / 86400000);
  return Math.max(1, Math.min(14, d || 3));
}

// Rule-based fallback when Claude isn't configured — still produces a usable plan.
function generateFallback(prefs, candidates) {
  const days = computeDays(prefs.startDate, prefs.endDate);
  const flight = candidates.flights[0] || null;
  const hotel = candidates.hotels[0] || null;
  const pkg = candidates.packages[0] || null;

  const dest =
    flight?.to || hotel?.city || prefs.destination || "your destination";

  const flightCost = flight ? flight.economyPrice * (prefs.travelers || 1) : 0;
  const hotelCost = hotel ? hotel.pricePerNight * days : 0;
  const estimatedTotal = Math.round((flightCost + hotelCost) * 100) / 100;

  const interestBlurb = (prefs.interests || []).length
    ? ` focusing on ${prefs.interests.join(", ")}`
    : "";

  const dayTemplates = [
    { title: "Arrival & settle in", activities: [
      "Check in and freshen up",
      `Stroll the neighborhood around ${hotel?.name || "your hotel"}`,
      "Welcome dinner at a local favorite",
    ]},
    { title: "Local highlights", activities: [
      `Visit the top landmarks of ${dest}`,
      "Lunch at a traditional spot",
      "Afternoon museum or gallery",
      "Sunset viewpoint",
    ]},
    { title: "Flavors & culture", activities: [
      "Food market tour",
      "Cooking class or tasting",
      "Evening entertainment",
    ]},
    { title: "Off the beaten path", activities: [
      "Day trip to a nearby gem",
      "Hidden cafés and bookstores",
      "Casual dinner with locals",
    ]},
    { title: "Nature & views", activities: [
      "Scenic walk or hike",
      "Picnic with local produce",
      "Golden-hour photo spot",
    ]},
    { title: "Leisure day", activities: [
      "Spa or beach relaxation",
      "Late brunch",
      "Shopping for souvenirs",
    ]},
    { title: "Farewell", activities: [
      "Final breakfast",
      "Last walk through a favorite spot",
      "Depart with stories",
    ]},
  ];

  const daysArr = Array.from({ length: days }, (_, i) => {
    const t = dayTemplates[Math.min(i, dayTemplates.length - 1)];
    return { day: i + 1, title: t.title, activities: t.activities };
  });

  return {
    summary: `A ${days}-day escape to ${dest}${interestBlurb}, built around the best matching flight and stay we have available.`,
    chosenFlightId: flight?.id || null,
    chosenHotelId: hotel?.id || null,
    chosenPackageId: pkg?.id || null,
    rationale: flight && hotel
      ? `We paired the earliest available flight to ${flight.to} with our best-value ${hotel.starRating ? hotel.starRating + "★ " : ""}stay in ${hotel.city}.`
      : "Selected from available options — adjust dates or destination for more choices.",
    days: daysArr,
    estimatedTotal,
    _mode: "fallback",
  };
}

// Hydrate chosen IDs with full records so the frontend can render rich cards.
async function hydratePlan(plan) {
  const [flight, hotel, pkg] = await Promise.all([
    plan.chosenFlightId
      ? prisma.flight.findUnique({ where: { id: plan.chosenFlightId } })
      : null,
    plan.chosenHotelId
      ? prisma.hotel.findUnique({ where: { id: plan.chosenHotelId } })
      : null,
    plan.chosenPackageId
      ? prisma.package.findUnique({ where: { id: plan.chosenPackageId } })
      : null,
  ]);

  return {
    ...plan,
    chosenFlight: flight,
    chosenHotel: hotel,
    chosenPackage: pkg,
  };
}

async function generatePlan(prefs) {
  const candidates = await findCandidates(prefs);
  const trimmed = trimForPrompt(candidates);

  let plan;
  if (isConfigured) {
    try {
      plan = await generateWithClaude(prefs, trimmed);
      plan._mode = "ai";
    } catch (err) {
      console.error("[planner] Claude failed, using fallback:", err.message);
      plan = generateFallback(prefs, trimmed);
      plan._mode = "fallback";
      plan._error = err.message;
    }
  } else {
    plan = generateFallback(prefs, trimmed);
  }

  // Authoritative total from actual picks + day count
  plan.estimatedTotal = recomputeTotal({ plan, prefs, candidates: trimmed });

  return {
    plan: await hydratePlan(plan),
    candidates: {
      flights: candidates.flights.length,
      hotels: candidates.hotels.length,
      packages: candidates.packages.length,
    },
  };
}

// ─── REFINE FLOW ───────────────────────────────────────────────────────────

async function refineWithClaude({ prefs, plan, instruction, history, candidates }) {
  const contextLine = prefs.context
    ? `\nTraveler profile: ${prefs.context}\n`
    : "";

  const historyLine =
    Array.isArray(history) && history.length
      ? `\nRecent refinement turns:\n${history
          .slice(-4)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")}\n`
      : "";

  const prompt = `You are an ATLAS travel concierge refining an existing trip plan.
${contextLine}
Traveler preferences:
${JSON.stringify(prefs, null, 2)}

Current plan:
${JSON.stringify(plan, null, 2)}

Available alternatives in our inventory:
${JSON.stringify(candidates, null, 2)}
${historyLine}
The traveler just said:
"${instruction}"

Update the plan to satisfy the request. Keep what already works; change only what the request asks for. If the request is to change destination, swap to one that matches the traveler's vibe. If "cheaper" — swap to lower-priced flight/hotel and trim costly activities. If "luxury" — pick higher-rated stays. If "shorter/longer" — adjust days array.

Return ONLY valid JSON with this schema:
{
  "summary": "...",
  "chosenFlightId": "<id or null>",
  "chosenHotelId": "<id or null>",
  "chosenPackageId": "<id or null>",
  "rationale": "...",
  "days": [ { "day": 1, "title": "...", "activities": ["...", "..."] } ],
  "estimatedTotal": <number>,
  "extrasTotal": <number — sum of any added non-inventory costs (nightlife, spa, luxury concierge, etc.) so the server can recompute the total reliably; 0 if no extras>,
  "newDestination": "<city name or null — only set if you swapped destinations>",
  "change": "1-2 sentences telling the user what you changed and why"
}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.content.find((b) => b.type === "text")?.text || "";
  return extractJson(text);
}

// Per-night cost added per refinement type (USD)
const EXTRA_PRICING = {
  nightlife: 45,    // bar / club cover per evening
  luxuryFee: 200,   // one-time luxury concierge upgrade
  spa: 30,          // per relaxation upgrade day
};

async function refineFallback({ prefs, plan, instruction, candidates }) {
  const text = String(instruction || "").toLowerCase();
  const next = JSON.parse(JSON.stringify(plan));
  let change = "";
  if (typeof next.extrasTotal !== "number") next.extrasTotal = 0;

  // Strip already-loaded full records to avoid duplicate IDs in update
  delete next.chosenFlight;
  delete next.chosenHotel;
  delete next.chosenPackage;

  const days = Array.isArray(next.days) && next.days.length
    ? next.days.length
    : computeDays(prefs.startDate, prefs.endDate);

  if (text.includes("cheap") || text.includes("budget") || text.includes("less")) {
    const cheapFlight = [...candidates.flights].sort((a, b) => a.economyPrice - b.economyPrice)[0];
    const cheapHotel = [...candidates.hotels].sort((a, b) => a.pricePerNight - b.pricePerNight)[0];
    if (cheapFlight) next.chosenFlightId = cheapFlight.id;
    if (cheapHotel) next.chosenHotelId = cheapHotel.id;
    // Wipe extras when going cheap
    next.extrasTotal = 0;
    change = "Swapped in the lowest-priced flight and stay, and trimmed extras.";
  } else if (text.includes("luxury") || text.includes("upgrade")) {
    const lux = [...candidates.hotels]
      .sort((a, b) => (b.starRating || 0) - (a.starRating || 0) || b.pricePerNight - a.pricePerNight)[0];
    if (lux) next.chosenHotelId = lux.id;
    // Bump extras with a luxury concierge fee
    next.extrasTotal = (next.extrasTotal || 0) + EXTRA_PRICING.luxuryFee;
    next.days = (next.days || []).map((d) => ({
      ...d,
      activities: [...(d.activities || []), "Private guide & premium tasting"],
    }));
    change = `Upgraded to our top-rated stay and added a luxury concierge ($${EXTRA_PRICING.luxuryFee}).`;
  } else if (text.includes("nightlife") || text.includes("party")) {
    next.days = (next.days || []).map((d) => ({
      ...d,
      activities: [...(d.activities || []), "Late-night cocktails at a local hotspot"],
    }));
    next.extrasTotal = (next.extrasTotal || 0) + EXTRA_PRICING.nightlife * days;
    change = `Added an evening nightlife stop to each day (+$${EXTRA_PRICING.nightlife}/night).`;
  } else if (text.includes("relax") || text.includes("calmer") || text.includes("slower")) {
    next.days = (next.days || []).map((d) => ({
      ...d,
      activities: (d.activities || []).slice(0, 2).concat(["Slow afternoon — pool, spa, or quiet café"]),
    }));
    // Add a small spa fee per day, but trim any nightlife extras
    next.extrasTotal = EXTRA_PRICING.spa * days;
    change = `Trimmed busy activities and added a daily spa/relax fee (+$${EXTRA_PRICING.spa}/day).`;
  } else if (text.includes("shorter")) {
    const newDays = Math.max(1, (next.days || []).length - 2);
    const ratio = newDays / Math.max(1, (next.days || []).length || 1);
    next.days = (next.days || []).slice(0, newDays);
    // Scale extras proportionally to the shorter trip
    next.extrasTotal = Math.round((next.extrasTotal || 0) * ratio);
    change = "Shortened the trip by 2 days.";
  } else if (text.includes("longer") || text.includes("extend")) {
    const prevLen = (next.days || []).length;
    const extra = {
      day: prevLen + 1,
      title: "Bonus day",
      activities: ["Hidden gem you missed", "Long lunch", "Sunset spot"],
    };
    next.days = [...(next.days || []), extra];
    // Scale extras proportionally to the longer trip
    if (prevLen > 0) {
      next.extrasTotal = Math.round((next.extrasTotal || 0) * ((prevLen + 1) / prevLen));
    }
    change = "Added an extra day with hidden-gem activities.";
  } else if (text.includes("destination") || text.includes("change") || text.includes("swap") || text.includes("different")) {
    // Need a wider candidate pool to swap destinations
    const broader = await findCandidates({ ...prefs, destination: "" });
    const trimmedBroader = trimForPrompt(broader);
    const currentArrival =
      candidates.flights.find((f) => f.id === next.chosenFlightId)?.to || null;
    const altFlight = trimmedBroader.flights.find(
      (f) => f.to && f.to !== currentArrival
    );
    if (altFlight) {
      next.chosenFlightId = altFlight.id;
      const altHotel = trimmedBroader.hotels.find((h) => h.city === altFlight.to);
      if (altHotel) next.chosenHotelId = altHotel.id;
      next.chosenPackageId = null;
      next.newDestination = altFlight.to;
      next.summary = `A new direction — ${altFlight.to} — same vibe, different scenery.`;
      next.rationale = `Swapped to ${altFlight.to} based on the next-best fit in our inventory.`;
      // Re-broadened candidates need to be exposed for recompute
      next._refineCandidates = trimmedBroader;
      change = `Switched destination to ${altFlight.to}.`;
    } else {
      change =
        "Couldn't find an alternative destination in current inventory — try a broader search.";
    }
  } else {
    change =
      "Demo mode is on, so I made a small adjustment. Add your ANTHROPIC_API_KEY for full refinement.";
  }

  next._mode = "fallback";
  next.change = change;
  return next;
}

// Always derive the total from the actual chosen items + trip length so the
// number stays in sync no matter what Claude (or the fallback) returns.
function recomputeTotal({ plan, prefs, candidates }) {
  const travelers = Math.max(1, parseInt(prefs.travelers, 10) || 1);

  const flight = plan.chosenFlightId
    ? candidates.flights.find((f) => f.id === plan.chosenFlightId)
    : null;
  const hotel = plan.chosenHotelId
    ? candidates.hotels.find((h) => h.id === plan.chosenHotelId)
    : null;
  const pkg = plan.chosenPackageId
    ? candidates.packages.find((p) => p.id === plan.chosenPackageId)
    : null;

  // Prefer day count from the itinerary (chat may have shortened/lengthened it),
  // fall back to date math.
  const days = Array.isArray(plan.days) && plan.days.length
    ? plan.days.length
    : computeDays(prefs.startDate, prefs.endDate);

  let total = 0;
  if (flight) total += Number(flight.economyPrice || 0) * travelers;
  if (hotel) total += Number(hotel.pricePerNight || 0) * days;
  if (pkg) {
    const discounted =
      Number(pkg.price || 0) * (1 - Number(pkg.discount || 0) / 100);
    total += discounted * travelers;
  }
  // Extras: nightlife, luxury fees, spa, etc. These are added by refinement
  // handlers (or returned by Claude for non-inventory line items).
  if (typeof plan.extrasTotal === "number") {
    total += Math.max(0, plan.extrasTotal);
  }

  return Math.round(total * 100) / 100;
}

async function refinePlan({ prefs, plan, instruction, history }) {
  const candidates = await findCandidates(prefs);
  const trimmed = trimForPrompt(candidates);
  const previousTotal = Number(plan.estimatedTotal) || 0;

  let updated;
  if (isConfigured) {
    try {
      updated = await refineWithClaude({
        prefs,
        plan,
        instruction,
        history,
        candidates: trimmed,
      });
      updated._mode = "ai";
    } catch (err) {
      console.error("[planner.refine] Claude failed, using fallback:", err.message);
      updated = await refineFallback({ prefs, plan, instruction, candidates: trimmed });
      updated._error = err.message;
    }
  } else {
    updated = await refineFallback({ prefs, plan, instruction, candidates: trimmed });
  }

  // For "change destination" the fallback may have widened the candidate
  // pool. Use that pool when recomputing so the new flight/hotel resolve.
  const recomputeCandidates = updated._refineCandidates || trimmed;
  delete updated._refineCandidates;

  // Authoritative total — overrides whatever the model returned.
  updated.estimatedTotal = recomputeTotal({
    plan: updated,
    prefs,
    candidates: recomputeCandidates,
  });

  return {
    plan: await hydratePlan(updated),
    change: updated.change || "Plan updated.",
    previousTotal,
  };
}

module.exports = { generatePlan, refinePlan };
