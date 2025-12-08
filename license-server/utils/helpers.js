const { v4: uuidv4 } = require('uuid');

function generateKey() {
  return uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
}

function calculateExpiry(plan) {
  const now = new Date();
  if (plan === 'lifetime') now.setFullYear(now.getFullYear() + 50);
  else if (plan === 'yearly') now.setFullYear(now.getFullYear() + 1);
  else now.setMonth(now.getMonth() + 1); // monthly default
  return now.toISOString();
}

module.exports = { generateKey, calculateExpiry };
