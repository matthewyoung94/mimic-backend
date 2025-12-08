const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const db = require('./db');
const { generateKey, calculateExpiry } = require('./utils/helpers');
require('dotenv').config();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], endpointSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.sendStatus(400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const email = session.customer_email;
    const plan = session.metadata?.plan || 'monthly';

    if (!email) return res.sendStatus(400);

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      db.prepare('INSERT INTO users (email) VALUES (?)').run(email);
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    }

    const key = generateKey();
    const expiry = calculateExpiry(plan);

    db.prepare(`
      INSERT INTO licenses (key, user_id, plan_type, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(key, user.id, plan, new Date().toISOString(), expiry);

    console.log(`✅ License created: ${key} for ${email}`);
  }

  if (
    event.type === 'customer.subscription.deleted' ||
    event.type === 'invoice.payment_failed'
  ) {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId);
    if (!user) {
      console.warn(`⚠️ No user found for customer ID: ${customerId}`);
      return res.status(200).send('ok');
    }

    db.prepare(`
      UPDATE licenses
      SET expires_at = ?
      WHERE user_id = ?
    `).run(new Date().toISOString(), user.id);

    console.log(`❌ License(s) expired for user: ${user.email}`);
  }

  res.status(200).send('ok');
});

module.exports = router;
