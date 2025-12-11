const licenseService = require("../services/licenseService");

exports.generateLicense = async (req, res) => {
  try {
    const data = await licenseService.generateLicense(req.body);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.activateLicense = async (req, res) => {
  try {
    const data = await licenseService.activateLicense(req.body);
    res.json(data);
  } catch (err) {
    res.status(400).json({ valid: false });
  }
};

exports.checkLicense = async (req, res) => {
  try {
    const data = await licenseService.checkLicense(req.query);
    res.json(data);
  } catch (err) {
    res.status(400).json({ valid: false });
  }
};
