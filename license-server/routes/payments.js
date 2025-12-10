const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/create-checkout-session", paymentController.createCheckoutSession);
router.post("/webhook", express.raw({ type: "application/json" }), paymentController.webhook);

module.exports = router;