require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL;

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Routes
const licenseRoutes = require("./routes/licenses");
const stripeRoutes = require("./routes/payments");

app.use("/licenses", licenseRoutes);
app.use("/payments", stripeRoutes);

app.get("/", (req, res) => {
  res.send("🎉 License API is running!");
});

app.listen(3000, () => {
  console.log("License API running on http://localhost:3000");
});
