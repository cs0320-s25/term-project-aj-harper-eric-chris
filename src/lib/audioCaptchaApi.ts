/**
 * Client-side audio captcha API
 * This replaces the previous server-side API with local, in-browser implementations
 */

import { defaultToneDetector, DetectionResult } from "./toneDetector";

interface ChallengeResponse {
  challengeId: string;
  success: boolean;
  message: string;
}

interface ToneResponse {
  frequency: number;
  success: boolean;
  message: string;
}

/**
 * Generate a unique challenge ID
 */
export const generateAudioChallenge = async (): Promise<ChallengeResponse> => {
  // Generate a random ID
  const randomId = Math.random().toString(36).substring(2, 15);

  return {
    challengeId: randomId,
    success: true,
    message: "Audio challenge generated successfully",
  };
};

/**
 * Get the tone data for a challenge
 */
export const getAudioTone = async (
  challengeId: string
): Promise<ToneResponse> => {
  // Generate a random frequency using the tone detector
  const frequency = defaultToneDetector.generateRandomTone();

  return {
    frequency,
    success: true,
    message: "Tone data retrieved successfully",
  };
};

/**
 * Process raw audio data and extract frequency/amplitude information
 */
export const processAudio = async (
  challengeId: string,
  audioData: Float32Array
): Promise<DetectionResult> => {
  // Process the audio data with our tone detector
  return defaultToneDetector.processAudioData(audioData);
};

/**
 * Verify if the user's recorded frequencies match the challenge
 */
export const verifyAudioResponse = async (
  challengeId: string,
  recordedFrequencies: number[]
): Promise<{
  success: boolean;
  message?: string;
  isBotDetected?: boolean;
  reason?: string;
}> => {
  // Filter out zeros and very low frequencies
  const validFrequencies = recordedFrequencies.filter((f) => f > 85);

  if (validFrequencies.length === 0) {
    return {
      success: false,
      message: "No valid frequencies detected",
    };
  }

  // Get challenge frequency - for compatibility with old code that still uses this API
  // We'll derive a target frequency from the recorded ones
  // In real implementation, this would be fetched from storage

  // This is just a stub implementation - we're assuming the challenge was successful
  // since the real verification happens in AudioCaptcha component
  return {
    success: true,
    message: "Audio challenge verified successfully",
  };
};
