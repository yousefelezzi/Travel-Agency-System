const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { registerRules, loginRules } = require("../middleware/validate.middleware");

router.post("/register", registerRules, register);
router.post("/login", loginRules, login);
router.get("/me", authenticate, getMe);

module.exports = router;
