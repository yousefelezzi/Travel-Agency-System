const express = require("express");
const router = express.Router();
const { createPaymentIntent, confirmPayment, mockConfirm } = require("../controllers/payment.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.use(authenticate);
router.use(authorize("CUSTOMER"));

router.post("/create-intent", createPaymentIntent);
router.post("/confirm", confirmPayment);
router.post("/mock-confirm", mockConfirm);

module.exports = router;
