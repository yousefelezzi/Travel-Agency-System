const express = require("express");
const router = express.Router();
const c = require("../controllers/provider.controller");
const { authenticateProvider } = require("../middleware/provider.middleware");

router.use(authenticateProvider);

router.get("/me", c.whoAmI);
router.post("/inventory", c.submitInventory);
router.get("/bookings", c.getProviderBookings);

module.exports = router;
