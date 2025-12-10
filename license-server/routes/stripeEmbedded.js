const express = require("express");
const router = express.Router();
const { embeddedCheckout, webhook } = require("../controllers/stripeEmbeddedController");

router.post("/embedded-checkout", embeddedCheckout);
router.post("/webhook", express.raw({ type: "application/json" }), webhook);

module.exports = router;
