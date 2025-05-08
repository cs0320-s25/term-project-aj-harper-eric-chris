// In-memory storage for challenges (in production, use a database)
const challenges = new Map();
const audioUtils = require("../utils/audioUtils");

// Add a cache for submitted frequency arrays to prevent replay attacks
const frequencySubmissionsCache = new Map(); // challengeId -> [{ frequencies: number[], timestamp: number }]

/**
 * Generate a new audio captcha challenge
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateChallenge = (req, res) => {
  try {
    // Generate a unique ID for this challenge
    const challengeId =
      Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Generate random frequency from common human voice range (easier to mimic)
    // Using frequencies between 200-400 Hz which are easier for humans to replicate
    const baseFrequencies = [200, 250, 300, 350, 400];
    const randomIndex = Math.floor(Math.random() * baseFrequencies.length);
    const frequency = baseFrequencies[randomIndex];

    // Store challenge data
    const challenge = {
      id: challengeId,
      frequency,
      createdAt: Date.now(),
      // Auto-expire after 5 minutes
      expireAt: Date.now() + 5 * 60 * 1000,
      verified: false,
    };

    challenges.set(challengeId, challenge);

    // Cleanup expired challenges
    cleanupExpiredChallenges();

    // Return the challenge ID to client
    return res.status(200).json({
      success: true,
      challengeId,
      message: "Audio challenge generated successfully",
    });
  } catch (error) {
    console.error("Error generating audio challenge:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate audio challenge",
    });
  }
};

/**
 * Process audio data and extract frequency information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processAudio = (req, res) => {
  try {
    const { challengeId, audioData } = req.body;

    // Validate request
    if (!challengeId || !audioData) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: challengeId or audioData",
      });
    }

    // Get challenge from storage
    const challenge = challenges.get(challengeId);

    // Check if challenge exists and is not expired
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found or expired",
      });
    }

    if (Date.now() > challenge.expireAt) {
      challenges.delete(challengeId);
      // Clear frequency history for this challenge
      audioUtils.clearFrequencyHistory(challengeId);
      return res.status(400).json({
        success: false,
        message: "Challenge has expired",
      });
    }

    // Process the audio data - pass challengeId for frequency smoothing
    // The audioData should be an array of Float32Array samples
    // We'll analyze it to extract frequency and amplitude
    const result = audioUtils.analyzeAudioData(audioData, 44100, challengeId);

    // Calculate confidence score with more lenient tolerance (0.25 = 25%)
    const tolerance = 0.25; // 25% tolerance
    const confidenceScore = audioUtils.calculateMatchConfidence(
      result.frequency,
      challenge.frequency,
      tolerance
    );

    // Return analyzed data
    return res.status(200).json({
      success: true,
      message: "Audio processed successfully",
      frequency: result.frequency,
      amplitude: result.amplitude,
      targetFrequency: challenge.frequency,
      confidenceScore: parseFloat(confidenceScore.toFixed(2)),
      isMatching: audioUtils.isFrequencyMatch(
        result.frequency,
        challenge.frequency,
        tolerance
      ),
      quality: result.quality || "medium",
    });
  } catch (error) {
    console.error("Error processing audio:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process audio data",
    });
  }
};

/**
 * Verify a user's audio captcha response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyResponse = (req, res) => {
  try {
    const { challengeId, recordedFrequencies } = req.body;

    // Validate request
    if (!challengeId || !recordedFrequencies || !Array.isArray(recordedFrequencies) || recordedFrequencies.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Missing required parameters: challengeId or recordedFrequencies",
      });
    }

    // Check for replay attack: reject if the same array was submitted for this challengeId in the last 5 minutes
    const now = Date.now();
    const cacheWindow = 5 * 60 * 1000; // 5 minutes
    const cacheEntry = frequencySubmissionsCache.get(challengeId) || [];
    // Remove expired entries
    const validEntries = cacheEntry.filter(entry => now - entry.timestamp < cacheWindow);
    // Check for exact match (same values and order)
    const isReplay = validEntries.some(entry =>
      entry.frequencies.length === recordedFrequencies.length &&
      entry.frequencies.every((val, idx) => val === recordedFrequencies[idx])
    );
    if (isReplay) {
      return res.status(429).json({
        success: false,
        message: "Replay attack detected: identical audio frequencies list submitted.",
      });
    }
    // Add this submission to the cache
    validEntries.push({ frequencies: recordedFrequencies, timestamp: now });
    frequencySubmissionsCache.set(challengeId, validEntries);

    // Get challenge from storage
    const challenge = challenges.get(challengeId);

    // Check if challenge exists and is not expired
    if (!challenge) {
      return res.status(402).json({
        success: false,
        message: "Challenge not found or expired",
      });
    }

    if (Date.now() > challenge.expireAt) {
      challenges.delete(challengeId);
      // Clear frequency history
      audioUtils.clearFrequencyHistory(challengeId);
      return res.status(403).json({
        success: false,
        message: "Challenge has expired",
      });
    }

    // Calculate the average of the recorded frequencies
    const avgFrequency = recordedFrequencies.reduce((sum, val) => sum + val, 0) / recordedFrequencies.length;

    // Verify if the average frequency matches the challenge frequency within tolerance
    const tolerance = 0.25; // 25% tolerance
    const isMatch = audioUtils.isFrequencyMatch(
      avgFrequency,
      challenge.frequency,
      tolerance
    );

    // Calculate confidence score for the average
    const confidenceScore = audioUtils.calculateMatchConfidence(
      avgFrequency,
      challenge.frequency,
      tolerance
    );

    challenge.verified = isMatch;

    if (isMatch) {
      // Clear frequency history after successful verification
      audioUtils.clearFrequencyHistory(challengeId);
      return res.status(200).json({
        success: true,
        message: "Audio challenge verified successfully",
        confidenceScore: parseFloat(confidenceScore.toFixed(2)),
        average: avgFrequency,
      });
    } else {
      const allowedDeviation = challenge.frequency * tolerance;
      return res.status(404).json({
        success: false,
        message: "Audio response does not match the challenge",
        expected: challenge.frequency,
        received: avgFrequency,
        tolerance: `±${allowedDeviation.toFixed(2)} Hz`,
        confidenceScore: parseFloat(confidenceScore.toFixed(2)),
      });
    }
  } catch (error) {
    console.error("Error verifying audio response:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify audio response",
    });
  }
};

/**
 * Stream the generated tone for a specific challenge
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const streamTone = (req, res) => {
  try {
    const { id } = req.params;

    // Get challenge from storage
    const challenge = challenges.get(id);

    // Check if challenge exists and is not expired
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found or expired",
      });
    }

    if (Date.now() > challenge.expireAt) {
      challenges.delete(id);
      // Clear frequency history
      audioUtils.clearFrequencyHistory(id);
      return res.status(400).json({
        success: false,
        message: "Challenge has expired",
      });
    }

    // Default implementation - return JSON with frequency info
    if (req.query.format !== "wav") {
      return res.status(200).json({
        success: true,
        frequency: challenge.frequency,
        message: "Tone data retrieved successfully",
      });
    }

    // Generate WAV file if requested
    const toneBuffer = audioUtils.generateToneBuffer(
      challenge.frequency,
      2, // 2 seconds duration
      44100 // Standard sample rate
    );

    // Set response headers
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="tone-${challenge.frequency}hz.wav"`
    );
    res.setHeader("Content-Length", toneBuffer.length);

    // Send WAV file
    return res.send(toneBuffer);
  } catch (error) {
    console.error("Error streaming tone:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to stream tone",
    });
  }
};

/**
 * Cleanup expired challenges from memory
 * In a production environment, this should be handled by a scheduled job
 */
const cleanupExpiredChallenges = () => {
  const now = Date.now();
  for (const [id, challenge] of challenges.entries()) {
    if (now > challenge.expireAt) {
      challenges.delete(id);
      // Clear frequency history for expired challenges
      audioUtils.clearFrequencyHistory(id);
    }
  }
};

module.exports = {
  generateChallenge,
  processAudio,
  verifyResponse,
  streamTone,
};
