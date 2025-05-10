/**
 * Utility functions for facial expression captcha
 */

// Define available expressions with their difficulty levels
const availableExpressions = {
  happy: { difficulty: "easy", weight: 3 },
  neutral: { difficulty: "easy", weight: 3 },
  sad: { difficulty: "medium", weight: 2 },
  surprised: { difficulty: "hard", weight: 1 },
  angry: { difficulty: "hard", weight: 1 },
};

// In-memory cache to prevent replay attacks
const expressionSubmissionsCache = new Map(); // challengeId -> [{ expressions: string[], timestamp: number }]

/**
 * Generate a random sequence of facial expressions
 * @param {number} length - Length of the sequence to generate
 * @returns {Array} Array of expression names
 */
const generateExpressionSequence = (length = 3) => {
  const sequence = [];
  const expressionKeys = Object.keys(availableExpressions);

  // Calculate total weight for weighted random selection
  const totalWeight = Object.values(availableExpressions).reduce(
    (sum, exp) => sum + exp.weight,
    0
  );

  for (let i = 0; i < length; i++) {
    // Weighted random selection
    let randomWeight = Math.random() * totalWeight;
    let selectedExpression = null;

    // Find expression based on weight
    for (const expression of expressionKeys) {
      randomWeight -= availableExpressions[expression].weight;
      if (randomWeight <= 0) {
        selectedExpression = expression;
        break;
      }
    }

    // Fallback if something went wrong with weighted selection
    if (!selectedExpression) {
      selectedExpression =
        expressionKeys[Math.floor(Math.random() * expressionKeys.length)];
    }

    // Avoid consecutive repeats
    if (i > 0 && selectedExpression === sequence[i - 1]) {
      // Try to get a different expression
      let attempts = 0;
      while (selectedExpression === sequence[i - 1] && attempts < 5) {
        selectedExpression =
          expressionKeys[Math.floor(Math.random() * expressionKeys.length)];
        attempts++;
      }
    }

    sequence.push(selectedExpression);
  }

  return sequence;
};

/**
 * Verify a single expression match
 * @param {string} targetExpression - The expected expression
 * @param {number} confidence - The confidence score (0-1)
 * @returns {boolean} Whether the expression matches with sufficient confidence
 */
const verifyExpressionMatch = (targetExpression, confidence) => {
  // Define confidence thresholds based on expression difficulty
  const thresholds = {
    easy: 0.5, // happy, neutral
    medium: 0.4, // sad
    hard: 0.3, // surprised, angry
  };

  // Get difficulty level for the target expression
  const difficulty =
    availableExpressions[targetExpression]?.difficulty || "medium";

  // Get appropriate threshold
  const threshold = thresholds[difficulty];

  // Return true if confidence meets or exceeds threshold
  return confidence >= threshold;
};

/**
 * Detect potential replay attack
 * @param {string} challengeId - The challenge ID
 * @param {Array} expressionData - Array of expression data objects
 * @returns {boolean} Whether a replay attack is detected
 */
const detectReplayAttack = (challengeId, expressionData) => {
  if (!expressionData || !Array.isArray(expressionData)) {
    return true; // Invalid data format, treat as attack
  }

  const now = Date.now();
  const cacheWindow = 5 * 60 * 1000; // 5 minutes

  // Get existing entries or initialize new array
  const cacheEntry = expressionSubmissionsCache.get(challengeId) || [];

  // Remove expired entries
  const validEntries = cacheEntry.filter(
    (entry) => now - entry.timestamp < cacheWindow
  );

  // Check for very similar submissions (possible replay)
  // Convert to JSON strings for simple deep comparison
  const currentSubmission = JSON.stringify(expressionData);

  const isReplay = validEntries.some(
    (entry) => JSON.stringify(entry.expressions) === currentSubmission
  );

  // Add current submission to cache
  validEntries.push({
    expressions: expressionData,
    timestamp: now,
  });
  expressionSubmissionsCache.set(challengeId, validEntries);

  return isReplay;
};

/**
 * Clear cached submission data for a challenge
 * @param {string} challengeId - The challenge ID to clear
 */
const clearSubmissionCache = (challengeId) => {
  expressionSubmissionsCache.delete(challengeId);
};

module.exports = {
  availableExpressions,
  generateExpressionSequence,
  verifyExpressionMatch,
  detectReplayAttack,
  clearSubmissionCache,
};
