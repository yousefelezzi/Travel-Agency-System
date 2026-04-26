const express = require("express");
const router = express.Router();
const {
  getCategories,
  getCategory,
  createTicket,
  getMyTickets,
  getAllTickets,
  resolveTicket,
} = require("../controllers/support.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

// Categories + FAQs are public so users can self-serve before logging in.
router.get("/categories", getCategories);
router.get("/categories/:id", getCategory);

// Everything else requires auth.
router.use(authenticate);

// Customer
router.post("/tickets", authorize("CUSTOMER"), createTicket);
router.get("/tickets/my", authorize("CUSTOMER"), getMyTickets);

// Agent + admin
router.get("/tickets/admin", authorize("TRAVEL_AGENT", "ADMIN"), getAllTickets);
router.put("/tickets/:id/resolve", authorize("TRAVEL_AGENT", "ADMIN"), resolveTicket);

module.exports = router;
