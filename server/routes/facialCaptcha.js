const express = require("express");
const facialCaptchaController = require("../controllers/facialCaptchaController");

const router = express.Router();

/**
 * @route   GET /api/facial-captcha/generate
 * @desc    Generate a new facial expression captcha challenge
 * @access  Public
 */
router.get("/generate", facialCaptchaController.generateChallenge);

/**
 * @route   POST /api/facial-captcha/verify
 * @desc    Verify a user's facial expression
 * @access  Public
 */
router.post("/verify", facialCaptchaController.verifyExpression);

/**
 * @route   POST /api/facial-captcha/skip
 * @desc    Skip the current expression in the sequence
 * @access  Public
 */
router.post("/skip", facialCaptchaController.skipExpression);

/**
 * @route   GET /api/facial-captcha/status/:id
 * @desc    Get the current status of a challenge
 * @access  Public
 */
router.get("/status/:id", facialCaptchaController.getChallengeStatus);

module.exports = router;
