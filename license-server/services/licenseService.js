const db = require("../db");
const { generateKey, calculateExpiry } = require("../utils/helpers");

exports.generateLicense = async ({ user_email, plan_type }) => {
  if (!user_email || !plan_type) throw new Error("Missing fields");

  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(user_email);
  if (!user) {
    db.prepare("INSERT INTO users (email) VALUES (?)").run(user_email);
    user = db.prepare("SELECT * FROM users WHERE email = ?").get(user_email);
  }

  const key = generateKey();
  const expiry = calculateExpiry(plan_type);

  db.prepare(
    `
      INSERT INTO licenses (key, user_id, plan_type, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(key, user.id, plan_type, new Date().toISOString(), expiry);

  return { key, expires_at: expiry };
};

exports.activateLicense = async ({ key, device_id }) => {
  if (!key || !device_id) throw new Error("Missing fields");

  const license = db.prepare("SELECT * FROM licenses WHERE key = ?").get(key);
  if (!license || license.status !== "active")
    return { valid: false, expires_at: null };

  if (new Date(license.expires_at) < new Date()) {
    db.prepare("UPDATE licenses SET status = ? WHERE id = ?").run(
      "expired",
      license.id
    );
    return { valid: false, expires_at: license.expires_at };
  }

  db.prepare(
    `
      INSERT INTO activations (license_id, device_id, activated_at)
      VALUES (?, ?, ?)
    `
  ).run(license.id, device_id, new Date().toISOString());

  return { valid: true, expires_at: license.expires_at };
};

exports.checkLicense = async ({ key }) => {
  const license = db.prepare("SELECT * FROM licenses WHERE key = ?").get(key);
  if (!license) return { valid: false, status: "not_found", expires_at: null };

  if (new Date(license.expires_at) < new Date()) {
    db.prepare("UPDATE licenses SET status = ? WHERE id = ?").run(
      "expired",
      license.id
    );
  }

  return {
    valid: license.status === "active",
    status: license.status,
    expires_at: license.expires_at,
  };
};
