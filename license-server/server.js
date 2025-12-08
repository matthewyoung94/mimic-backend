const express = require("express");
const app = express();

const licenseRoutes = require("./routes/licenses");
const stripeWebhook = require("./stripe-webhook");
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(express.json());

app.post("/create-checkout-session", async (req, res) => {
  const { priceId, email, plan } = req.body;

  try {
    const price = await stripe.prices.retrieve(priceId);
    const mode = price.recurring ? "subscription" : "payment";
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { plan },
      success_url:
        "http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:3000/cancel",
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.use("/", licenseRoutes);

app.use("/stripe", stripeWebhook); // Endpoint: POST /stripe/webhook

app.get("/", (req, res) => {
  res.send("🎉 License API is running! Use Postman or /generate-license etc.");
});

app.listen(3000, () => {
  console.log("License API running on http://localhost:3000");
});
