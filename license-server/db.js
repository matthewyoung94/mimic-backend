const Database = require('better-sqlite3');
const db = new Database('licenses.db');

// Users
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE
  )
`).run();

// Licenses
db.prepare(`
  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    user_id INTEGER,
    plan_type TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT,
    expires_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`).run();

// Activations
db.prepare(`
  CREATE TABLE IF NOT EXISTS activations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER,
    device_id TEXT,
    activated_at TEXT,
    FOREIGN KEY(license_id) REFERENCES licenses(id)
  )
`).run();

module.exports = db;

