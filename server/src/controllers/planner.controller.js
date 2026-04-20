const { generatePlan } = require("../services/planner.service");

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
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { generate };
