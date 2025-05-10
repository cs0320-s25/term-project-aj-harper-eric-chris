const express = require("express");
const cors = require("cors");
const audioCaptchaRoutes = require("./routes/audioCaptcha");
const facialCaptchaRoutes = require("./routes/facialCaptcha");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Add rate limiting to prevent brute force attacks
const rateLimit = require("express-rate-limit");

// Standard API limiter - 100 requests per 15 minutes
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
});

// Higher limit for audio processing - 300 requests per minute (5 per second)
const audioProcessLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // limit each IP to 300 requests per minute
  message: {
    success: false,
    message:
      "Too many audio processing requests, please try again after 1 minute",
  },
});

// Apply specific rate limiters to different endpoints
app.use("/api/audio-captcha/process", audioProcessLimiter);
app.use("/api/audio-captcha", standardLimiter);
app.use("/api/facial-captcha", standardLimiter);

// Routes
app.use("/api/audio-captcha", audioCaptchaRoutes);
app.use("/api/facial-captcha", facialCaptchaRoutes);

// Basic health check route
app.get("/api/health", (req, res) => {
  res
    .status(200)
    .json({ status: "ok", message: "MimiCap Captcha API is running" });
});

// Start server
app.listen(PORT, () => {
  console.log(`MimiCap Captcha server running on port ${PORT}`);
});
