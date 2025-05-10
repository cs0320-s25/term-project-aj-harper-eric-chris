const express = require("express");
const audioCaptchaController = require("../controllers/audioCaptchaController");

const router = express.Router();

/**
 * @route   GET /api/audio-captcha/generate
 * @desc    Generate a new audio captcha challenge
 * @access  Public
 */
router.get("/generate", audioCaptchaController.generateChallenge);

/**
 * @route   POST /api/audio-captcha/process
 * @desc    Process audio data in real-time for frequency analysis
 * @access  Public
 */
router.post("/process", audioCaptchaController.processAudio);

/**
 * @route   POST /api/audio-captcha/verify
 * @desc    Verify a user's audio captcha response
 * @access  Public
 */
router.post("/verify", audioCaptchaController.verifyResponse);

/**
 * @route   GET /api/audio-captcha/tone/:id
 * @desc    Stream the generated tone for a specific challenge
 * @access  Public
 */
router.get("/tone/:id", audioCaptchaController.streamTone);

module.exports = router;
