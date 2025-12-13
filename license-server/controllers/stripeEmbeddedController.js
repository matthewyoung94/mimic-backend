const stripe = require("../config/stripe");
const {
  createEmbeddedCheckoutSession,
  handleCheckoutSessionCompleted,
  handleSubscriptionCancelledOrFailed,
} = require("../services/stripeEmbeddedService");

const FRONTEND_URL = process.env.FRONTEND_URL;

async function embeddedCheckout(req, res) {
  const { priceId, plan } = req.body;
  if (!priceId || !plan) return res.status(400).json({ error: "Missing priceId or plan" });

  try {
    const session = await createEmbeddedCheckoutSession(priceId, plan);

    session.success_url = `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`;
    session.cancel_url = `${FRONTEND_URL}/cancel`;

    res.json(session);
  } catch (err) {
    console.error("Error creating embedded session:", err);
    res.status(500).json({ message: err.message });
  }
}

function webhook(req, res) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      endpointSecret
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.sendStatus(400);
  }

  switch (event.type) {
    case "checkout.session.completed":
      handleCheckoutSessionCompleted(event.data.object);
      break;

    case "customer.subscription.deleted":
    case "invoice.payment_failed":
      handleSubscriptionCancelledOrFailed(event.data.object);
      break;
  }

  res.status(200).send("ok");
}

module.exports = { embeddedCheckout, webhook };
