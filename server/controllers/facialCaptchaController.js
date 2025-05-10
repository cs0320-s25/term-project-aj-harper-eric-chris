// In-memory storage for challenges (in production, use a database)
const challenges = new Map();
const facialUtils = require("../utils/facialUtils");

/**
 * Generate a new facial expression captcha challenge
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateChallenge = (req, res) => {
  try {
    // Generate a unique ID for this challenge
    const challengeId =
      Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Generate a random sequence of expressions (default length: 3)
    const expressionSequence = facialUtils.generateExpressionSequence();

    // Store challenge data
    const challenge = {
      id: challengeId,
      sequence: expressionSequence,
      currentIndex: 0,
      createdAt: Date.now(),
      // Auto-expire after 5 minutes
      expireAt: Date.now() + 5 * 60 * 1000,
      verified: false,
      completedExpressions: [],
    };

    challenges.set(challengeId, challenge);

    // Cleanup expired challenges
    cleanupExpiredChallenges();

    // Return the challenge ID and first expression to client
    return res.status(200).json({
      success: true,
      challengeId,
      currentExpression: expressionSequence[0],
      totalExpressions: expressionSequence.length,
      message: "Facial expression challenge generated successfully",
    });
  } catch (error) {
    console.error("Error generating facial expression challenge:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate facial expression challenge",
    });
  }
};

/**
 * Verify a user's facial expression
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyExpression = (req, res) => {
  try {
    const { challengeId, expressionData } = req.body;

    // Validate request
    if (!challengeId || !expressionData) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: challengeId or expressionData",
      });
    }

    // Check for potential replay attack
    if (facialUtils.detectReplayAttack(challengeId, expressionData)) {
      return res.status(429).json({
        success: false,
        message:
          "Replay attack detected: similar expression data has been submitted",
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
      facialUtils.clearSubmissionCache(challengeId);
      return res.status(400).json({
        success: false,
        message: "Challenge has expired",
      });
    }

    // Get current expression to verify
    const currentExpression = challenge.sequence[challenge.currentIndex];
    const confidence = expressionData.confidence;

    // Check if expression matches with sufficient confidence
    const isMatch = facialUtils.verifyExpressionMatch(
      currentExpression,
      confidence
    );

    if (isMatch) {
      // Record this expression as completed
      challenge.completedExpressions.push({
        expression: currentExpression,
        timestamp: Date.now(),
        confidence,
      });

      // Move to next expression or complete challenge
      challenge.currentIndex++;

      if (challenge.currentIndex >= challenge.sequence.length) {
        // All expressions completed
        challenge.verified = true;

        return res.status(200).json({
          success: true,
          message: "Facial expression challenge completed successfully",
          isComplete: true,
        });
      } else {
        // Return next expression in sequence
        return res.status(200).json({
          success: true,
          message: "Expression verified successfully",
          isComplete: false,
          nextExpression: challenge.sequence[challenge.currentIndex],
          remainingExpressions:
            challenge.sequence.length - challenge.currentIndex,
        });
      }
    } else {
      // Expression didn't match or confidence too low
      return res.status(400).json({
        success: false,
        message: "Expression not matched with sufficient confidence",
        expectedExpression: currentExpression,
        receivedConfidence: confidence,
        requiredConfidence:
          facialUtils.availableExpressions[currentExpression]?.difficulty ||
          "medium",
      });
    }
  } catch (error) {
    console.error("Error verifying facial expression:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify facial expression",
    });
  }
};

/**
 * Skip the current expression in the sequence
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const skipExpression = (req, res) => {
  try {
    const { challengeId } = req.body;

    // Validate request
    if (!challengeId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: challengeId",
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
      facialUtils.clearSubmissionCache(challengeId);
      return res.status(400).json({
        success: false,
        message: "Challenge has expired",
      });
    }

    // Get current expression
    const currentExpression = challenge.sequence[challenge.currentIndex];

    // Generate a new expression different from the current one
    const availableExpressions = Object.keys(facialUtils.availableExpressions);
    let newExpression;

    do {
      newExpression =
        availableExpressions[
          Math.floor(Math.random() * availableExpressions.length)
        ];
    } while (newExpression === currentExpression);

    // Replace current expression
    challenge.sequence[challenge.currentIndex] = newExpression;

    return res.status(200).json({
      success: true,
      message: "Expression skipped successfully",
      newExpression: newExpression,
    });
  } catch (error) {
    console.error("Error skipping expression:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to skip expression",
    });
  }
};

/**
 * Get the current status of a challenge
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getChallengeStatus = (req, res) => {
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
      facialUtils.clearSubmissionCache(id);
      return res.status(400).json({
        success: false,
        message: "Challenge has expired",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Challenge status retrieved successfully",
      currentExpression: challenge.sequence[challenge.currentIndex],
      currentIndex: challenge.currentIndex,
      totalExpressions: challenge.sequence.length,
      timeRemaining: challenge.expireAt - Date.now(),
    });
  } catch (error) {
    console.error("Error getting challenge status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get challenge status",
    });
  }
};

/**
 * Clean up expired challenges from memory
 */
const cleanupExpiredChallenges = () => {
  const now = Date.now();

  for (const [id, challenge] of challenges.entries()) {
    if (now > challenge.expireAt) {
      challenges.delete(id);
      facialUtils.clearSubmissionCache(id);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupExpiredChallenges, 10 * 60 * 1000);

module.exports = {
  generateChallenge,
  verifyExpression,
  skipExpression,
  getChallengeStatus,
};
