const express = require("express");
const router = express.Router();
const { embeddedCheckout } = require("../controllers/stripeEmbeddedController");

router.post("/embedded-checkout", embeddedCheckout);

module.exports = router;
