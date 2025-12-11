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

const licenseRoutes = require("./routes/licenses");
const stripeEmbeddedRoutes = require("./routes/stripeEmbedded");

app.use("/licenses", licenseRoutes);
app.use("/stripe", stripeEmbeddedRoutes);

app.get("/", (req, res) => {
  res.send("🎉 License API is running!");
});

app.listen(3000, () => {
  console.log("License API running on http://localhost:3000");
});
