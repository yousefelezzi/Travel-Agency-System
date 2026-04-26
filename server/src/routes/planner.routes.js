const express = require("express");
const router = express.Router();
const { generate, refine } = require("../controllers/planner.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);
router.use(authorize("CUSTOMER"));

router.post("/generate", generate);
router.post("/refine", refine);

module.exports = router;
