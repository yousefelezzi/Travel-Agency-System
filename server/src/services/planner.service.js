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

  let plan;
  if (isConfigured) {
    try {
      plan = await generateWithClaude(prefs, trimForPrompt(candidates));
      plan._mode = "ai";
    } catch (err) {
      console.error("[planner] Claude failed, using fallback:", err.message);
      plan = generateFallback(prefs, trimForPrompt(candidates));
      plan._mode = "fallback";
      plan._error = err.message;
    }
  } else {
    plan = generateFallback(prefs, trimForPrompt(candidates));
  }

  return {
    plan: await hydratePlan(plan),
    candidates: {
      flights: candidates.flights.length,
      hotels: candidates.hotels.length,
      packages: candidates.packages.length,
    },
  };
}

module.exports = { generatePlan };
