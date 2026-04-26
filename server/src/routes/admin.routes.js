const express = require("express");
const router = express.Router();
const c = require("../controllers/admin.controller");
const p = require("../controllers/provider.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

// All admin routes require staff auth.
router.use(authenticate);

// Customer search (used by agents for book-on-behalf)
router.get("/customers", authorize("TRAVEL_AGENT", "ADMIN"), c.searchCustomers);
router.get("/customers/:id/bookings", authorize("TRAVEL_AGENT", "ADMIN"), c.getCustomerBookings);

// Reports — agent + admin can both view performance
router.get("/reports/summary", authorize("TRAVEL_AGENT", "ADMIN"), c.reportsSummary);

// Cancellation policy — agent can read, only admin can write
router.get("/config/cancellation-policy", authorize("TRAVEL_AGENT", "ADMIN"), c.getCancellationPolicy);
router.put("/config/cancellation-policy", authorize("ADMIN"), c.updateCancellationPolicy);

// API credentials (admin only)
router.get("/config/api-credentials", authorize("ADMIN"), c.listApiCredentials);
router.post("/config/api-credentials", authorize("ADMIN"), c.upsertApiCredential);
router.delete("/config/api-credentials/:provider", authorize("ADMIN"), c.deleteApiCredential);

// User & role management (admin only)
router.get("/users", authorize("ADMIN"), c.listUsers);
router.post("/users", authorize("ADMIN"), c.createStaff);
router.put("/users/:id", authorize("ADMIN"), c.updateUser);

// Job listings (admin manages)
router.get("/jobs", authorize("TRAVEL_AGENT", "ADMIN"), c.listAllJobs);
router.post("/jobs", authorize("ADMIN"), c.createJob);
router.put("/jobs/:id", authorize("ADMIN"), c.updateJob);
router.delete("/jobs/:id", authorize("ADMIN"), c.deleteJob);
router.get("/applications", authorize("TRAVEL_AGENT", "ADMIN"), c.listApplications);

// Provider management (admin only)
router.get("/providers", authorize("ADMIN"), p.listProviders);
router.post("/providers", authorize("ADMIN"), p.createProvider);
router.put("/providers/:id", authorize("ADMIN"), p.updateProvider);
router.post("/providers/:id/rotate-key", authorize("ADMIN"), p.rotateProviderKey);
router.get("/providers/:id/logs", authorize("ADMIN"), p.getProviderLogs);

module.exports = router;
