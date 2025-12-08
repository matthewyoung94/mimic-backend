const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateKey, calculateExpiry } = require('../utils/helpers');

// POST /generate-license
router.post('/generate-license', (req, res) => {
  const { user_email, plan_type } = req.body;
  if (!user_email || !plan_type) return res.status(400).json({ error: 'Missing fields' });

  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(user_email);
  if (!user) {
    db.prepare('INSERT INTO users (email) VALUES (?)').run(user_email);
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(user_email);
  }

  const key = generateKey();
  const expiry = calculateExpiry(plan_type);

  db.prepare(`
    INSERT INTO licenses (key, user_id, plan_type, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(key, user.id, plan_type, new Date().toISOString(), expiry);

  res.json({ key, expires_at: expiry });
});

// POST /activate-license
router.post('/activate-license', (req, res) => {
  const { key, device_id } = req.body;
  if (!key || !device_id) return res.status(400).json({ valid: false });

  const license = db.prepare('SELECT * FROM licenses WHERE key = ?').get(key);
  if (!license || license.status !== 'active') {
    return res.json({ valid: false, expires_at: null });
  }

  if (new Date(license.expires_at) < new Date()) {
    db.prepare('UPDATE licenses SET status = ? WHERE id = ?').run('expired', license.id);
    return res.json({ valid: false, expires_at: license.expires_at });
  }

  db.prepare(`
    INSERT INTO activations (license_id, device_id, activated_at)
    VALUES (?, ?, ?)
  `).run(license.id, device_id, new Date().toISOString());

  res.json({ valid: true, expires_at: license.expires_at });
});

// GET /check-license?key=XXXX
router.get('/check-license', (req, res) => {
  const { key } = req.query;
  const license = db.prepare('SELECT * FROM licenses WHERE key = ?').get(key);
  if (!license) {
    return res.json({ valid: false, status: 'not_found', expires_at: null });
  }

  if (new Date(license.expires_at) < new Date()) {
    db.prepare('UPDATE licenses SET status = ? WHERE id = ?').run('expired', license.id);
  }

  res.json({
    valid: license.status === 'active',
    status: license.status,
    expires_at: license.expires_at,
  });
});

module.exports = router;
