const express = require("express");
const router = express.Router();
const {
  searchHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
} = require("../controllers/hotel.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.get("/", searchHotels);
router.get("/:id", getHotelById);
router.post("/", authenticate, authorize("TRAVEL_AGENT", "ADMIN"), createHotel);
router.put("/:id", authenticate, authorize("TRAVEL_AGENT", "ADMIN"), updateHotel);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteHotel);

module.exports = router;
