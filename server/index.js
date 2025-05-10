const express = require("express");
const cors = require("cors");
const audioCaptchaRoutes = require("./routes/audioCaptcha");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/audio-captcha", audioCaptchaRoutes);

// Basic health check route
app.get("/api/health", (req, res) => {
  res
    .status(200)
    .json({ status: "ok", message: "Audio Captcha API is running" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Audio Captcha server running on port ${PORT}`);
});
