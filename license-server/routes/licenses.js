const express = require("express");
const router = express.Router();
const licenseController = require("../controllers/licenseController");

router.post("/generate", licenseController.generateLicense);
router.post("/activate", licenseController.activateLicense);
router.get("/check", licenseController.checkLicense);

module.exports = router;
