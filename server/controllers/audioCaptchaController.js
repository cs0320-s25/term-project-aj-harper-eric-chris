// In-memory storage for challenges (in production, use a database)
const challenges = new Map();
const audioUtils = require("../utils/audioUtils");

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
      return res.status(400).json({
        success: false,
        message: "Challenge has expired",
      });
    }

    // Process the audio data
    // The audioData should be an array of Float32Array samples
    // We'll analyze it to extract frequency and amplitude
    const { frequency, amplitude } = audioUtils.analyzeAudioData(audioData);

    // Calculate confidence score
    const tolerance = 0.15; // 15% tolerance
    const confidenceScore = audioUtils.calculateMatchConfidence(
      frequency,
      challenge.frequency,
      tolerance
    );

    // Return analyzed data
    return res.status(200).json({
      success: true,
      message: "Audio processed successfully",
      frequency,
      amplitude,
      targetFrequency: challenge.frequency,
      confidenceScore: parseFloat(confidenceScore.toFixed(2)),
      isMatching: audioUtils.isFrequencyMatch(
        frequency,
        challenge.frequency,
        tolerance
      ),
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
    const { challengeId, recordedFrequency } = req.body;

    // Validate request
    if (!challengeId || !recordedFrequency) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required parameters: challengeId or recordedFrequency",
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
      return res.status(400).json({
        success: false,
        message: "Challenge has expired",
      });
    }

    // Verify the frequency using our utility function
    const tolerance = 0.15; // 15% tolerance
    const isMatch = audioUtils.isFrequencyMatch(
      recordedFrequency,
      challenge.frequency,
      tolerance
    );

    // Calculate confidence score
    const confidenceScore = audioUtils.calculateMatchConfidence(
      recordedFrequency,
      challenge.frequency,
      tolerance
    );

    // Update challenge status
    challenge.verified = isMatch;

    if (isMatch) {
      return res.status(200).json({
        success: true,
        message: "Audio challenge verified successfully",
        confidenceScore: parseFloat(confidenceScore.toFixed(2)),
      });
    } else {
      const allowedDeviation = challenge.frequency * tolerance;
      return res.status(400).json({
        success: false,
        message: "Audio response does not match the challenge",
        expected: challenge.frequency,
        received: recordedFrequency,
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
    }
  }
};

module.exports = {
  generateChallenge,
  processAudio,
  verifyResponse,
  streamTone,
};
