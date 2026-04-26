// Booking.com15 (RapidAPI) wrapper.
//
// Returns inventory shaped like our internal Flight / Hotel records so the
// client can render them with the same components. When the upstream errors
// (rate limit, network, missing key) we resolve to an empty array — the
// caller falls back to the seeded DB so the app stays functional.

const HOST = process.env.RAPIDAPI_HOST || "booking-com15.p.rapidapi.com";
const KEY = process.env.RAPIDAPI_KEY || "";
const ENABLED = process.env.EXTERNAL_INVENTORY_ENABLED === "true" && !!KEY;

// In-memory cache. The free tier is 500 req/month so we lean hard on this.
const TTL_MS = 5 * 60 * 1000;
const cache = new Map();

const cacheGet = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const cacheSet = (key, value) => cache.set(key, { value, at: Date.now() });

const callRapid = async (path, params) => {
  if (!ENABLED) return null;
  const url = new URL(`https://${HOST}${path}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const cacheKey = url.toString();
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const resp = await fetch(url, {
      headers: {
        "x-rapidapi-host": HOST,
        "x-rapidapi-key": KEY,
      },
      signal: controller.signal,
    });
    if (!resp.ok) {
      console.warn(`[external] ${path} → ${resp.status}`);
      return null;
    }
    const json = await resp.json();
    // Only cache responses that actually carry inventory; empty payloads
    // would otherwise lock a route out for the full TTL after a transient miss.
    const hasContent =
      Array.isArray(json?.data) ? json.data.length > 0
        : Array.isArray(json?.data?.flightOffers) ? json.data.flightOffers.length > 0
        : Array.isArray(json?.data?.hotels) ? json.data.hotels.length > 0
        : true;
    if (hasContent) cacheSet(cacheKey, json);
    return json;
  } catch (err) {
    console.warn(`[external] ${path} failed: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

// ── Flights ──────────────────────────────────────────────────────────────

const resolveFlightLocation = async (query) => {
  if (!query) return null;
  const data = await callRapid("/api/v1/flights/searchDestination", { query });
  const list = data?.data || [];
  // Prefer airport over city
  return list.find((d) => d.type === "AIRPORT") || list[0] || null;
};

const mapFlight = (offer, fromAirport, toAirport) => {
  // Booking's flight schema is deeply nested; pick the bits we need.
  const segments = offer?.segments || [];
  const firstSeg = segments[0]?.legs?.[0] || segments[0] || {};
  const lastSeg =
    segments[segments.length - 1]?.legs?.slice(-1)[0] ||
    segments[segments.length - 1] ||
    {};
  const carrier =
    firstSeg.carriersData?.[0]?.name ||
    firstSeg.marketingCarrier?.name ||
    firstSeg.airline ||
    "Live carrier";
  const flightNumber =
    firstSeg.flightInfo?.flightNumber ||
    firstSeg.flightNumber ||
    `LIVE-${(offer?.token || "").slice(-5).toUpperCase()}`;
  const economyPrice =
    offer?.priceBreakdown?.total?.units ||
    offer?.travellerPrices?.[0]?.travellerPriceBreakdown?.total?.units ||
    offer?.totalPrice ||
    0;

  const departureDate = firstSeg.departureTime
    ? new Date(firstSeg.departureTime)
    : null;
  const arrivalDate = lastSeg.arrivalTime
    ? new Date(lastSeg.arrivalTime)
    : null;

  // Keep ID compact and unique — Booking tokens share a long gzip prefix.
  const carrierCode = firstSeg.carriersData?.[0]?.code || "XX";
  const fnum = String(flightNumber || "0");
  const priceCents = Math.round(Number(economyPrice || 0) * 100);
  const shortId = `live-${carrierCode}${fnum}-${priceCents}`;
  return {
    id: shortId,
    airlineName: carrier,
    airlineCode: firstSeg.carriersData?.[0]?.code || "",
    flightNumber: String(flightNumber),
    departurePort:
      firstSeg.departureAirport?.code ||
      firstSeg.departureAirport?.name ||
      fromAirport,
    arrivalPort:
      lastSeg.arrivalAirport?.code ||
      lastSeg.arrivalAirport?.name ||
      toAirport,
    departureDate,
    arrivalDate,
    economyPrice: Number(economyPrice) || 0,
    businessPrice: Number(economyPrice) ? Number(economyPrice) * 2.5 : 0,
    firstClassPrice: Number(economyPrice) ? Number(economyPrice) * 4 : 0,
    availableSeats: 9,
    totalSeats: 180,
    isLive: true,
    source: "booking.com",
    externalUrl: "https://www.booking.com/flights",
  };
};

const searchExternalFlights = async ({ from, to, date, passengers = 1 }) => {
  if (!ENABLED || !from || !to || !date) return { flights: [], totalAvailable: 0 };
  // Booking's free tier rate-limits aggressively, so resolve destinations
  // sequentially rather than in parallel (avoids a 429 on the second call).
  const origin = await resolveFlightLocation(from);
  if (!origin?.id) return { flights: [], totalAvailable: 0 };
  const dest = await resolveFlightLocation(to);
  if (!dest?.id) return { flights: [], totalAvailable: 0 };

  const data = await callRapid("/api/v1/flights/searchFlights", {
    fromId: origin.id,
    toId: dest.id,
    departDate: date,
    adults: passengers,
    currency_code: "USD",
  });
  const offers = data?.data?.flightOffers || data?.flightOffers || [];
  const totalAvailable =
    data?.data?.aggregation?.totalCount ||
    data?.data?.aggregation?.filteredTotalCount ||
    offers.length;
  return {
    flights: offers.map((o) => mapFlight(o, from, to)),
    totalAvailable,
  };
};

// ── Hotels ───────────────────────────────────────────────────────────────

const resolveHotelLocation = async (query) => {
  if (!query) return null;
  const data = await callRapid("/api/v1/hotels/searchDestination", { query });
  const list = data?.data || [];
  return list.find((d) => d.dest_type === "city") || list[0] || null;
};

const mapHotel = (h, fallbackCity, fallbackCountry) => {
  const price =
    h?.property?.priceBreakdown?.grossPrice?.value ||
    h?.priceBreakdown?.grossPrice?.value ||
    h?.composite_price_breakdown?.gross_amount?.value ||
    h?.min_total_price ||
    0;
  const hotelId = h?.hotel_id || h?.property?.id;
  return {
    id: `live-${hotelId || Math.random().toString(36).slice(2)}`,
    name: h?.property?.name || h?.hotel_name || "Live hotel",
    city: h?.property?.wishlistName || h?.city || fallbackCity || "—",
    country: h?.country_trans || fallbackCountry || "",
    address: h?.address || h?.property?.address || "",
    description: h?.property?.reviewScoreWord
      ? `Guest score: ${h.property.reviewScoreWord}`
      : "",
    pricePerNight: Number(price) || 0,
    starRating: Math.round(
      h?.property?.propertyClass || h?.class || h?.starRating || 4
    ),
    rating: h?.property?.reviewScore || h?.review_score || null,
    photoUrl:
      h?.property?.photoUrls?.[0] ||
      h?.main_photo_url ||
      h?.max_photo_url ||
      null,
    availableRooms: 5,
    totalRooms: 100,
    isLive: true,
    source: "booking.com",
    externalUrl: hotelId
      ? `https://www.booking.com/hotel/${(h?.country || "us").toLowerCase()}/${hotelId}.html`
      : "https://www.booking.com",
  };
};

const searchExternalHotels = async ({
  city,
  country,
  checkIn,
  checkOut,
  guests = 2,
}) => {
  if (!ENABLED || !city) return { hotels: [], totalAvailable: 0 };
  const dest = await resolveHotelLocation(city);
  if (!dest?.dest_id) return { hotels: [], totalAvailable: 0 };

  // Booking requires arrival/departure dates; default to a 2-night stay starting tomorrow.
  const today = new Date();
  const arrival =
    checkIn ||
    new Date(today.getTime() + 86400000).toISOString().slice(0, 10);
  const departure =
    checkOut ||
    new Date(today.getTime() + 3 * 86400000).toISOString().slice(0, 10);

  const data = await callRapid("/api/v1/hotels/searchHotels", {
    dest_id: dest.dest_id,
    search_type: dest.search_type || "CITY",
    arrival_date: arrival,
    departure_date: departure,
    adults: guests,
    room_qty: 1,
    currency_code: "USD",
    units: "metric",
    page_number: 1,
  });
  const list = data?.data?.hotels || data?.hotels || [];
  const totalAvailable =
    data?.data?.meta?.[0]?.title?.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, "")
      ? parseInt(data.data.meta[0].title.match(/(\d[\d,]*)/)[1].replace(/,/g, ""), 10)
      : data?.data?.pagination?.nbResultsTotal ||
        data?.data?.unfiltered_count ||
        list.length;
  return {
    hotels: list.map((h) => mapHotel(h, city, country)),
    totalAvailable,
  };
};

module.exports = {
  ENABLED,
  searchExternalFlights,
  searchExternalHotels,
};
