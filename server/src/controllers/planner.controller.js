const { generatePlan, refinePlan } = require("../services/planner.service");

// POST /api/planner/generate
const generate = async (req, res, next) => {
  try {
    const {
      destination = "",
      startDate,
      endDate,
      travelers = 1,
      budget = null,
      style = "",
      interests = [],
      context = "",
    } = req.body || {};

    if (!destination && !startDate && !endDate) {
      return res.status(400).json({
        error: { message: "Provide at least a destination or travel dates." },
      });
    }

    const result = await generatePlan({
      destination: String(destination).trim(),
      startDate,
      endDate,
      travelers: Math.max(1, parseInt(travelers, 10) || 1),
      budget: budget ? Number(budget) : null,
      style: String(style || "").trim(),
      interests: Array.isArray(interests) ? interests.slice(0, 6) : [],
      context: typeof context === "string" ? context.slice(0, 600) : "",
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// POST /api/planner/refine
const refine = async (req, res, next) => {
  try {
    const { prefs = {}, plan, instruction = "", history = [] } = req.body || {};
    if (!plan || typeof plan !== "object") {
      return res
        .status(400)
        .json({ error: { message: "plan is required" } });
    }
    if (!instruction || typeof instruction !== "string") {
      return res
        .status(400)
        .json({ error: { message: "instruction is required" } });
    }

    const result = await refinePlan({
      prefs: {
        destination: String(prefs.destination || "").trim(),
        startDate: prefs.startDate || null,
        endDate: prefs.endDate || null,
        travelers: Math.max(1, parseInt(prefs.travelers, 10) || 1),
        budget: prefs.budget ? Number(prefs.budget) : null,
        style: String(prefs.style || "").trim(),
        interests: Array.isArray(prefs.interests) ? prefs.interests.slice(0, 6) : [],
        context: typeof prefs.context === "string" ? prefs.context.slice(0, 600) : "",
      },
      plan,
      instruction: instruction.slice(0, 500),
      history: Array.isArray(history) ? history.slice(-6) : [],
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { generate, refine };
