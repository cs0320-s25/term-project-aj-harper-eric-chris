/**
 * API services for audio captcha functionality
 */

// API base URL - can be configured based on environment
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

/**
 * Generate a new audio captcha challenge
 * @returns Promise with challenge data
 */
export const generateAudioChallenge = async (): Promise<{
  success: boolean;
  challengeId: string;
  message: string;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/audio-captcha/generate`);

    if (!response.ok) {
      throw new Error(`Failed to generate challenge: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error generating audio challenge:", error);
    throw error;
  }
};

/**
 * Get the tone data for a challenge
 * @param challengeId - The ID of the challenge
 * @returns Promise with tone data
 */
export const getAudioTone = async (
  challengeId: string
): Promise<{
  success: boolean;
  frequency: number;
  message: string;
}> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/audio-captcha/tone/${challengeId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get tone: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting audio tone:", error);
    throw error;
  }
};

/**
 * Get the audio WAV file for a challenge
 * @param challengeId - The ID of the challenge
 * @returns Promise with audio blob
 */
export const getAudioFile = async (challengeId: string): Promise<Blob> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/audio-captcha/tone/${challengeId}?format=wav`
    );

    if (!response.ok) {
      throw new Error(`Failed to get audio file: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error("Error getting audio file:", error);
    throw error;
  }
};

/**
 * Process audio data for real-time analysis
 * @param challengeId - The ID of the challenge
 * @param audioData - The audio data as Float32Array or number[]
 * @returns Promise with processed audio data
 */
export const processAudio = async (
  challengeId: string,
  audioData: Float32Array | number[]
): Promise<{
  success: boolean;
  message: string;
  frequency: number;
  amplitude: number;
  targetFrequency: number;
  confidenceScore: number;
  isMatching: boolean;
  error?: string;
}> => {
  try {
    // Convert Float32Array to regular array for JSON serialization
    const serializedAudioData = Array.from(audioData);

    const response = await fetch(`${API_BASE_URL}/audio-captcha/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        challengeId,
        audioData: serializedAudioData,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error("Error processing audio data:", error);
    throw error;
  }
};

/**
 * Verify a user's audio response
 * @param challengeId - The ID of the challenge
 * @param recordedFrequency - The frequency recorded from the user
 * @returns Promise with verification result
 */
export const verifyAudioResponse = async (
  challengeId: string,
  recordedFrequency: number
): Promise<{
  success: boolean;
  message: string;
  confidenceScore?: number;
  expected?: number;
  received?: number;
  tolerance?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/audio-captcha/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ challengeId, recordedFrequency }),
    });

    return await response.json();
  } catch (error) {
    console.error("Error verifying audio response:", error);
    throw error;
  }
};
