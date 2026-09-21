const db = require("../db");
const { generateKey, calculateExpiry } = require("../utils/helpers");
const stripe = require("../config/stripe");

async function createEmbeddedCheckoutSession(priceId, plan) {
  const price = await stripe.prices.retrieve(priceId);
  const mode = price.recurring ? "subscription" : "payment";

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode,
    metadata: { plan },
    redirect_on_completion: "never",
    branding_settings: {
      background_color: "#2e2d2d",
      button_color: "#2e2d2d",
      border_style: "pill",
    },
  });

  return { id: session.id, client_secret: session.client_secret };
}

function handleCheckoutSessionCompleted(session) {
  const email = session.customer_details?.email;
  const plan = session.metadata?.plan || "monthly";
  const stripeCustomerId = session.customer;

  if (!email || !stripeCustomerId) {
    console.warn("Missing email or Stripe customer ID in session:", session.id);
    return;
  }

  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    db.prepare("INSERT INTO users (email) VALUES (?)").run(email);
    user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  }

  if (!user.stripe_customer_id) {
    db.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?").run(
      stripeCustomerId,
      user.id
    );
  }

  const key = generateKey();
  const expiry = calculateExpiry(plan);

  db.prepare(
    `
    INSERT INTO licenses (key, user_id, plan_type, created_at, expires_at, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(key, user.id, plan, new Date().toISOString(), expiry, "active");

  console.log(`✅ License created: ${key} for ${email} (plan: ${plan})`);
}

function handleSubscriptionCancelledOrFailed(subscription) {
  const customerId = subscription.customer;

  const user = db
    .prepare("SELECT * FROM users WHERE stripe_customer_id = ?")
    .get(customerId);
  if (!user) return;

  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE licenses
    SET expires_at = ?, status = 'expired'
    WHERE user_id = ? AND status = 'active'
  `
  ).run(now, user.id);

  console.log(`❌ License(s) expired for user: ${user.email}`);
}

module.exports = {
  createEmbeddedCheckoutSession,
  handleCheckoutSessionCompleted,
  handleSubscriptionCancelledOrFailed,
};
