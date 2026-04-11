const express = require("express");
const router = express.Router();
const {
  searchFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
} = require("../controllers/flight.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

// Public
router.get("/", searchFlights);
router.get("/:id", getFlightById);

// Agent + Admin
router.post("/", authenticate, authorize("TRAVEL_AGENT", "ADMIN"), createFlight);
router.put("/:id", authenticate, authorize("TRAVEL_AGENT", "ADMIN"), updateFlight);

// Admin only
router.delete("/:id", authenticate, authorize("ADMIN"), deleteFlight);

module.exports = router;
