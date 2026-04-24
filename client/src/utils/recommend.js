import { DESTINATIONS } from "../data/destinations";

const VIBE_LABEL = {
  relaxation: "relaxation",
  adventure: "adventure",
  culture: "culture",
  luxury: "luxury",
  party: "nightlife",
  nature: "nature",
};

const BUDGET_LABEL = {
  "under-500": "under $500",
  "500-1000": "$500–$1,000",
  "1000-3000": "$1,000–$3,000",
  "3000+": "$3,000+",
};

const DURATION_LABEL = {
  weekend: "a quick weekend",
  "3-5": "a 3–5 day trip",
  "1-week": "a one-week getaway",
  "2-weeks": "a longer 2+ week trip",
};

const CLIMATE_LABEL = {
  warm: "warm weather",
  cold: "cool weather",
  any: "any climate",
};

const GROUP_LABEL = {
  solo: "solo travel",
  couple: "a couple's trip",
  friends: "a friends trip",
  family: "a family trip",
};

const REGION_LABEL = {
  europe: "Europe",
  asia: "Asia",
  "middle-east": "the Middle East",
  anywhere: "anywhere",
};

const ACTIVITY_LABEL = {
  beaches: "beaches",
  hiking: "hiking",
  food: "food",
  nightlife: "nightlife",
  history: "history",
  shopping: "shopping",
};

const overlap = (a = [], b = []) => a.filter((x) => b.includes(x)).length;

const scoreDestination = (dest, prefs) => {
  let score = 0;
  const reasons = [];

  // Vibe (multi-select) — 0–4 pts
  const vibeHits = overlap(prefs.vibe || [], dest.tags.vibe || []);
  if (vibeHits > 0) {
    score += vibeHits * 2;
    const matched = (prefs.vibe || []).filter((v) => dest.tags.vibe.includes(v));
    reasons.push(`matches your ${matched.map((v) => VIBE_LABEL[v] || v).join(" + ")} vibe`);
  }

  // Budget — 0–3 pts
  if (prefs.budget) {
    if (dest.tags.budget?.includes(prefs.budget)) {
      score += 3;
      reasons.push(`fits your ${BUDGET_LABEL[prefs.budget]} budget`);
    } else {
      score -= 1;
    }
  }

  // Duration — 0–2 pts
  if (prefs.duration && dest.tags.duration?.includes(prefs.duration)) {
    score += 2;
    reasons.push(`works well as ${DURATION_LABEL[prefs.duration]}`);
  }

  // Group type — 0–2 pts
  if (prefs.groupType && dest.tags.groupType?.includes(prefs.groupType)) {
    score += 2;
    reasons.push(`great for ${GROUP_LABEL[prefs.groupType]}`);
  }

  // Climate — 0–2 pts
  if (prefs.climate && prefs.climate !== "any") {
    if (dest.tags.climate === prefs.climate) {
      score += 2;
      reasons.push(`has the ${CLIMATE_LABEL[prefs.climate]} you wanted`);
    }
  } else if (prefs.climate === "any") {
    score += 0.5;
  }

  // Activities — 0–6 pts
  const actHits = overlap(prefs.activities || [], dest.tags.activities || []);
  if (actHits > 0) {
    score += actHits * 1.5;
    const matched = (prefs.activities || []).filter((a) =>
      dest.tags.activities.includes(a)
    );
    reasons.push(`built for ${matched.map((a) => ACTIVITY_LABEL[a] || a).join(", ")}`);
  }

  // Region — 0–2 pts
  if (prefs.region) {
    if (prefs.region === "anywhere" || dest.region === prefs.region) {
      score += prefs.region === "anywhere" ? 0.5 : 2;
      if (prefs.region !== "anywhere") {
        reasons.push(`in ${REGION_LABEL[prefs.region]}`);
      }
    } else {
      score -= 1;
    }
  }

  return { score, reasons };
};

const composeWhy = (prefs, reasons) => {
  if (reasons.length === 0) {
    return "A versatile pick that fits a wide range of travelers.";
  }
  const lead = reasons.slice(0, 3).join(", ");
  return `Great match because it ${lead}.`;
};

const fitLabel = (score, max) => {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.75) return "Excellent fit";
  if (pct >= 0.55) return "Strong fit";
  if (pct >= 0.35) return "Good fit";
  return "Worth a look";
};

export const recommend = (prefs, limit = 5) => {
  if (!prefs) return [];
  const ranked = DESTINATIONS.map((d) => {
    const { score, reasons } = scoreDestination(d, prefs);
    return {
      destination: d,
      score,
      why: composeWhy(prefs, reasons),
      reasons,
    };
  })
    .sort((a, b) => b.score - a.score)
    .filter((r) => r.score > 0);

  const top = ranked.slice(0, limit);
  const max = top[0]?.score || 1;
  return top.map((r) => ({ ...r, fit: fitLabel(r.score, max) }));
};

export const buildPlannerContext = (prefs) => {
  if (!prefs) return null;
  const parts = [];
  if (prefs.vibe?.length)
    parts.push(`a ${prefs.vibe.map((v) => VIBE_LABEL[v] || v).join("/")} trip`);
  if (prefs.duration) parts.push(DURATION_LABEL[prefs.duration]);
  if (prefs.climate && prefs.climate !== "any")
    parts.push(`in ${CLIMATE_LABEL[prefs.climate]}`);
  if (prefs.groupType) parts.push(`for ${GROUP_LABEL[prefs.groupType]}`);
  if (prefs.budget) parts.push(`with a ${BUDGET_LABEL[prefs.budget]} budget`);
  if (prefs.activities?.length)
    parts.push(
      `interested in ${prefs.activities.map((a) => ACTIVITY_LABEL[a] || a).join(", ")}`
    );
  if (prefs.region && prefs.region !== "anywhere")
    parts.push(`preferably in ${REGION_LABEL[prefs.region]}`);
  return parts.length ? `The user wants ${parts.join(", ")}.` : null;
};

const BUDGET_TO_USD = {
  "under-500": 400,
  "500-1000": 800,
  "1000-3000": 2000,
  "3000+": 4000,
};

const DURATION_TO_DAYS = {
  weekend: 3,
  "3-5": 4,
  "1-week": 7,
  "2-weeks": 14,
};

const GROUP_TO_TRAVELERS = {
  solo: 1,
  couple: 2,
  friends: 3,
  family: 4,
};

const VIBE_TO_STYLE = {
  luxury: "luxury",
  relaxation: "balanced",
  party: "luxury",
  culture: "balanced",
  adventure: "balanced",
  nature: "budget",
};

const VIBE_TO_INTERESTS = {
  relaxation: ["relax"],
  adventure: ["adventure"],
  culture: ["culture"],
  luxury: ["relax"],
  party: ["nightlife"],
  nature: ["adventure"],
};

const ACTIVITY_TO_INTEREST = {
  beaches: "beach",
  hiking: "adventure",
  food: "food",
  nightlife: "nightlife",
  history: "culture",
  shopping: "culture",
};

export const quizToPlannerForm = (prefs, destinationName = "") => {
  if (!prefs) return null;

  const budget = prefs.budget ? BUDGET_TO_USD[prefs.budget] : "";
  const duration = prefs.duration ? DURATION_TO_DAYS[prefs.duration] : 0;
  const travelers = prefs.groupType ? GROUP_TO_TRAVELERS[prefs.groupType] : 2;

  // Suggest start date 30 days out, end based on duration
  const today = new Date();
  const startDate = new Date(today.getTime() + 30 * 86400000);
  const endDate = duration
    ? new Date(startDate.getTime() + duration * 86400000)
    : null;
  const fmt = (d) => d?.toISOString().slice(0, 10) || "";

  const interestSet = new Set();
  (prefs.vibe || []).forEach((v) =>
    (VIBE_TO_INTERESTS[v] || []).forEach((i) => interestSet.add(i))
  );
  (prefs.activities || []).forEach((a) => {
    if (ACTIVITY_TO_INTEREST[a]) interestSet.add(ACTIVITY_TO_INTEREST[a]);
  });

  const styles = (prefs.vibe || []).map((v) => VIBE_TO_STYLE[v]).filter(Boolean);
  const style = styles[0] || "balanced";

  return {
    destination: destinationName,
    startDate: fmt(startDate),
    endDate: endDate ? fmt(endDate) : "",
    travelers,
    budget: budget || "",
    style,
    interests: Array.from(interestSet),
  };
};
