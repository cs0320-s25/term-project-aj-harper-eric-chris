/**
 * API services for facial captcha functionality
 */

// API base URL - can be configured based on environment
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

/**
 * Generate a new facial expression captcha challenge
 * @returns Promise with challenge data
 */
export const generateFacialChallenge = async (): Promise<{
  success: boolean;
  challengeId: string;
  currentExpression: string;
  totalExpressions: number;
  message: string;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/facial-captcha/generate`);

    if (!response.ok) {
      throw new Error(`Failed to generate challenge: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error generating facial expression challenge:", error);
    throw error;
  }
};

/**
 * Verify a user's facial expression
 * @param challengeId - The ID of the challenge
 * @param expressionData - Data about the detected expression
 * @returns Promise with verification result
 */
export const verifyExpression = async (
  challengeId: string,
  expressionData: {
    expression: string;
    confidence: number;
    timestamp: number;
  }
): Promise<{
  success: boolean;
  message: string;
  isComplete?: boolean;
  nextExpression?: string;
  remainingExpressions?: number;
  expectedExpression?: string;
  receivedConfidence?: number;
  requiredConfidence?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/facial-captcha/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ challengeId, expressionData }),
    });

    return await response.json();
  } catch (error) {
    console.error("Error verifying facial expression:", error);
    throw error;
  }
};

/**
 * Skip the current expression in the sequence
 * @param challengeId - The ID of the challenge
 * @returns Promise with the new expression
 */
export const skipExpression = async (
  challengeId: string
): Promise<{
  success: boolean;
  message: string;
  newExpression: string;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/facial-captcha/skip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ challengeId }),
    });

    return await response.json();
  } catch (error) {
    console.error("Error skipping expression:", error);
    throw error;
  }
};

/**
 * Get the current status of a challenge
 * @param challengeId - The ID of the challenge
 * @returns Promise with challenge status
 */
export const getChallengeStatus = async (
  challengeId: string
): Promise<{
  success: boolean;
  message: string;
  currentExpression: string;
  currentIndex: number;
  totalExpressions: number;
  timeRemaining: number;
}> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/facial-captcha/status/${challengeId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get challenge status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting challenge status:", error);
    throw error;
  }
};
