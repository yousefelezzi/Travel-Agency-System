const express = require("express");
const router = express.Router();
const c = require("../controllers/admin.controller");

// Public careers portal
router.get("/", c.listPublishedJobs);
router.post("/:id/apply", c.applyToJob);

module.exports = router;
