require("dotenv").config();
const stripe = require("../config/stripe");
const db = require("../db");
const { generateKey, calculateExpiry } = require("../utils/helpers");

const FRONTEND_URL = process.env.FRONTEND_URL;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.createCheckoutSession = async (req, res) => {
  const { priceId, email, plan } = req.body;

  if (!priceId || !email) {
    return res.status(400).json({ error: "Missing priceId or email" });
  }

  try {
    const price = await stripe.prices.retrieve(priceId);
    const mode = price.recurring ? "subscription" : "payment";

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { plan },
      success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.webhook = (req, res) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], endpointSecret);
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.sendStatus(400);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const email = session.customer_email;
      const plan = session.metadata?.plan || "monthly";

      if (!email) return res.sendStatus(400);

      let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user) {
        db.prepare("INSERT INTO users (email) VALUES (?)").run(email);
        user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      }

      const key = generateKey();
      const expiry = calculateExpiry(plan);

      db.prepare(`
        INSERT INTO licenses (key, user_id, plan_type, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(key, user.id, plan, new Date().toISOString(), expiry);

      console.log(`✅ License created: ${key} for ${email}`);
      break;
    }

    case "customer.subscription.deleted":
    case "invoice.payment_failed": {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const user = db.prepare("SELECT * FROM users WHERE stripe_customer_id = ?").get(customerId);

      if (!user) return res.status(200).send("ok");

      db.prepare(`UPDATE licenses SET expires_at = ? WHERE user_id = ?`).run(new Date().toISOString(), user.id);
      console.log(`❌ License(s) expired for user: ${user.email}`);
      break;
    }
  }

  res.status(200).send("ok");
};
