const express = require("express");
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  getCancellationQuote,
  cancelBooking,
  modifyBooking,
  getAllBookings,
  downloadInvoicePdf,
} = require("../controllers/booking.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

// All booking routes require authentication
router.use(authenticate);

// Customer + agent/admin (agents pass onBehalfOfCustomerId)
router.post("/", authorize("CUSTOMER", "TRAVEL_AGENT", "ADMIN"), createBooking);
router.get("/", authorize("CUSTOMER"), getMyBookings);
router.get("/:id", getBookingById);
router.get("/:id/cancellation-quote", getCancellationQuote);
router.get("/:id/invoice.pdf", downloadInvoicePdf);
router.post("/:id/cancel", cancelBooking);
router.put("/:id/modify", modifyBooking);

// Admin/Agent routes
router.get("/admin/all", authorize("TRAVEL_AGENT", "ADMIN"), getAllBookings);

module.exports = router;
