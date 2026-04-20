const express = require("express");
const router = express.Router();
const { generate } = require("../controllers/planner.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);
router.use(authorize("CUSTOMER"));

router.post("/generate", generate);

module.exports = router;
