const express = require("express");
const router = express.Router();
const { getMyFavorites, addFavorite, removeFavorite } = require("../controllers/favorite.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate, authorize("CUSTOMER"));
router.get("/", getMyFavorites);
router.post("/", addFavorite);
router.delete("/:id", removeFavorite);

module.exports = router;
