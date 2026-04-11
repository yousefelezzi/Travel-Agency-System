const express = require("express");
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  modifyBooking,
  getAllBookings,
} = require("../controllers/booking.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

// All booking routes require authentication
router.use(authenticate);

// Customer routes
router.post("/", authorize("CUSTOMER"), createBooking);
router.get("/", authorize("CUSTOMER"), getMyBookings);
router.get("/:id", getBookingById);
router.post("/:id/cancel", cancelBooking);
router.put("/:id/modify", modifyBooking);

// Admin/Agent routes
router.get("/admin/all", authorize("TRAVEL_AGENT", "ADMIN"), getAllBookings);

module.exports = router;
