// Cancellation policy service. Encapsulates the fee schedule so the admin
// configuration page can later adjust thresholds without touching controllers.
//
// Default tiered policy (matches TC_049 example):
//   - More than 7 days before earliest travel: 10% fee
//   - 7 days or fewer (incl. after departure): 30% fee
//   - Already-cancelled bookings: not allowed
//
// PENDING bookings (never paid) are cancelled with no fee.

const prisma = require("../config/db");

const DEFAULT_POLICY = {
  earlyTierDays: 7,
  earlyFeePercent: 10,
  lateFeePercent: 30,
  pendingFeePercent: 0,
};

const POLICY_KEY = "cancellation_policy";

// Cache the policy to avoid hitting the DB on every cancellation check.
// Refresh when the admin updates it (we just clear the cache).
let cachedPolicy = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

async function loadPolicyFromDb() {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: POLICY_KEY } });
    return row?.value || null;
  } catch {
    return null;
  }
}

async function refreshPolicyCache() {
  cachedPolicy = (await loadPolicyFromDb()) || DEFAULT_POLICY;
  cachedAt = Date.now();
  return cachedPolicy;
}

// Pulls the earliest "travel" date from booking items so we can decide which
// tier applies. Uses departure for flights, check-in for hotels, startDate
// for packages, and falls back to the booking date if none are set.
function earliestTravelDate(booking) {
  const candidates = [];
  for (const item of booking.items || []) {
    if (item.flight?.departureDate) candidates.push(new Date(item.flight.departureDate));
    if (item.checkIn) candidates.push(new Date(item.checkIn));
    if (item.package?.startDate) candidates.push(new Date(item.package.startDate));
  }
  if (candidates.length === 0) return null;
  return new Date(Math.min(...candidates.map((d) => d.getTime())));
}

function daysUntil(date, from = new Date()) {
  if (!date) return null;
  return Math.ceil((date.getTime() - from.getTime()) / 86400000);
}

function getPolicy() {
  // Sync getter — uses cached value or defaults. Async refresh runs in background.
  if (!cachedPolicy || Date.now() - cachedAt > CACHE_TTL_MS) {
    refreshPolicyCache().catch(() => {});
  }
  return cachedPolicy || DEFAULT_POLICY;
}

// Returns { feePercent, feeAmount, refundAmount, daysOut, tier, reason }
function quoteCancellation(booking) {
  const policy = getPolicy();
  const total = Number(booking.totalAmount) - Number(booking.discount || 0);

  if (booking.status === "PENDING") {
    return {
      feePercent: policy.pendingFeePercent,
      feeAmount: 0,
      refundAmount: 0, // nothing has been charged yet
      daysOut: null,
      tier: "pending",
      reason: "No payment captured — cancelling at no charge.",
      policy,
    };
  }

  const travelDate = earliestTravelDate(booking);
  const daysOut = daysUntil(travelDate);

  let feePercent;
  let tier;
  if (daysOut === null) {
    feePercent = policy.earlyFeePercent;
    tier = "no-date";
  } else if (daysOut > policy.earlyTierDays) {
    feePercent = policy.earlyFeePercent;
    tier = "early";
  } else {
    feePercent = policy.lateFeePercent;
    tier = "late";
  }

  const feeAmount = Math.round(total * (feePercent / 100) * 100) / 100;
  const refundAmount = Math.max(0, Math.round((total - feeAmount) * 100) / 100);

  return {
    feePercent,
    feeAmount,
    refundAmount,
    daysOut,
    tier,
    reason:
      tier === "early"
        ? `${daysOut} days before travel — ${feePercent}% fee applies.`
        : tier === "late"
        ? `${daysOut} days before travel — ${feePercent}% short-notice fee applies.`
        : tier === "no-date"
        ? "No travel date on record — default early-tier fee applies."
        : "",
    policy,
  };
}

module.exports = {
  quoteCancellation,
  earliestTravelDate,
  daysUntil,
  getPolicy,
  refreshPolicyCache,
};
