const express = require("express");
const router = express.Router();
const {
  browsePackages,
  getPackageById,
  getAllPackages,
  createPackage,
  updatePackage,
  togglePublish,
  deletePackage,
} = require("../controllers/package.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

// Public (only published packages)
router.get("/", browsePackages);
router.get("/:id", getPackageById);

// Agent + Admin
router.get("/manage/all", authenticate, authorize("TRAVEL_AGENT", "ADMIN"), getAllPackages);
router.post("/", authenticate, authorize("TRAVEL_AGENT", "ADMIN"), createPackage);
router.put("/:id", authenticate, authorize("TRAVEL_AGENT", "ADMIN"), updatePackage);
router.patch("/:id/publish", authenticate, authorize("TRAVEL_AGENT", "ADMIN"), togglePublish);

// Admin only
router.delete("/:id", authenticate, authorize("ADMIN"), deletePackage);

module.exports = router;
