/**
 * ToneDetector - Core pitch detection and analysis class
 * Implements YIN algorithm for fundamental frequency detection
 */

import { appendFile } from "fs";

export interface DetectionResult {
  frequency: number;
  amplitude: number;
  confidenceScore: number;
  isBotLike: boolean;
  botLikeReason?: string;
  time?: number;
}

export interface ToneDetectorOptions {
  // Minimum acceptable frequency (Hz)
  minFrequency?: number;
  // Maximum acceptable frequency (Hz)
  maxFrequency?: number;
  // Frequency match tolerance (0-1)
  tolerance?: number;
  // Buffer size for FFT analysis
  bufferSize?: number;
  // Enable bot detection
  enableBotDetection?: boolean;
}

export class ToneDetector {
  private options: Required<ToneDetectorOptions>;
  private recentFrequencies: number[] = [];
  private recentAmplitudes: number[] = [];
  private lastProcessedAt: number = 0;
  private replayBuffer: DetectionResult[] = [];
  private static DEFAULT_OPTIONS: Required<ToneDetectorOptions> = {
    minFrequency: 85,
    maxFrequency: 1000,
    tolerance: 0.1,
    bufferSize: 2048,
    enableBotDetection: true,
  };

  constructor(options?: ToneDetectorOptions) {
    this.options = {
      ...ToneDetector.DEFAULT_OPTIONS,
      ...options,
    };

    // Initialize history arrays
    this.recentFrequencies = new Array(10).fill(0);
    this.recentAmplitudes = new Array(10).fill(0);
  }

  /**
   * Process raw audio data and extract frequency information
   */
  public processAudioData(audioData: Float32Array): DetectionResult {
    // Rate limit processing
    const now = Date.now();
    if (now - this.lastProcessedAt < 50) {
      // Return the last result if called too frequently
      return {
        frequency: this.recentFrequencies[0] || 0,
        amplitude: this.recentAmplitudes[0] || 0,
        confidenceScore: 0,
        isBotLike: false,
      };
    }
    this.lastProcessedAt = now;

    // Get amplitude
    const amplitude = this.getAmplitude(audioData);

    // Lower noise floor to better detect quiet humming
    const noiseFloor = 0.005; // Reduced from 0.015 to detect quieter sounds
    if (amplitude < noiseFloor) {
      return {
        frequency: 0,
        amplitude,
        confidenceScore: 0,
        isBotLike: false,
      };
    }

    // Detect the fundamental frequency using YIN algorithm
    const { frequency, confidence } = this.detectPitchYIN(audioData);

    // Lower confidence threshold to be more sensitive
    const confidenceThreshold = 0.1; // Reduced from 0.2 to accept weaker signals
    if (confidence < confidenceThreshold) {
      return {
        frequency: 0,
        amplitude,
        confidenceScore: 0,
        isBotLike: false,
      };
    }

    // Update history
    this.recentFrequencies.unshift(frequency);
    this.recentFrequencies = this.recentFrequencies.slice(0, 10);
    this.recentAmplitudes.unshift(amplitude);
    this.recentAmplitudes = this.recentAmplitudes.slice(0, 10);
    // Scale confidence score by amplitude - adjust scaling for quieter sounds
    const scaledConfidence = confidence * Math.min(1, amplitude * 10); // Increased scaling factor from 5 to 10
    // Check for bot-like behavior

    const botCheckResult = this.options.enableBotDetection
      ? this.checkForBotBehavior(frequency, amplitude, scaledConfidence)
      : { isBotLike: false };

    if (botCheckResult.isBotLike == true) {
      this.replayBuffer.push({
        frequency,
        amplitude,
        confidenceScore: scaledConfidence,
        ...botCheckResult,
        time: Date.now(),
      });
    }

    return {
      frequency,
      amplitude,
      confidenceScore: scaledConfidence,
      ...botCheckResult,
    };
  }

  public isReplayed(
    frequency: number,
    amplitude: number,
    confidenceScore: number
  ): boolean {
    this.replayBuffer.forEach((record) => {
      if (
        frequency == record.frequency &&
        amplitude == record.amplitude &&
        confidenceScore == record.confidenceScore
      ) {
        return true;
      }
    });
    return false;
  }
  /**
   * Check if the user's tone matches a target frequency
   */
  public isFrequencyMatch(
    userFreq: number,
    targetFreq: number,
    customTolerance?: number
  ): boolean {
    if (userFreq < this.options.minFrequency) return false;

    const tolerance = customTolerance ?? this.options.tolerance;

    // Check direct match (within tolerance percentage)
    if (Math.abs(userFreq - targetFreq) <= targetFreq * tolerance) return true;

    // Check octave up match
    if (Math.abs(userFreq - targetFreq * 2) <= targetFreq * 2 * tolerance)
      return true;

    // Check octave down match
    if (Math.abs(userFreq - targetFreq / 2) <= (targetFreq / 2) * tolerance)
      return true;

    return false;
  }

  public pruneReplayBuffer() {
    const TEN_MINUTES = 10 * 60 * 1000;
    const cutoff = Date.now() - TEN_MINUTES;
    this.replayBuffer = this.replayBuffer.filter(
      (r) => (r.time ?? 0) >= cutoff
    );
  }

  /**
   * Calculate frequency match confidence - combines multiple factors
   */
  public calculateMatchConfidence(
    userFreq: number,
    targetFreq: number
  ): number {
    if (userFreq < this.options.minFrequency) return 0;

    // Calculate distance as a percentage of target frequency
    const distance = Math.abs(userFreq - targetFreq) / targetFreq;

    // If it's a direct match
    if (distance <= this.options.tolerance) {
      return Math.max(0, 1 - distance / this.options.tolerance);
    }

    // Check octave matches with reduced confidence
    const octaveUpDistance =
      Math.abs(userFreq - targetFreq * 2) / (targetFreq * 2);
    if (octaveUpDistance <= this.options.tolerance) {
      return Math.max(0, 0.8 * (1 - octaveUpDistance / this.options.tolerance));
    }

    const octaveDownDistance =
      Math.abs(userFreq - targetFreq / 2) / (targetFreq / 2);
    if (octaveDownDistance <= this.options.tolerance) {
      return Math.max(
        0,
        0.8 * (1 - octaveDownDistance / this.options.tolerance)
      );
    }

    return 0;
  }

  /**
   * Generates a random tone suitable for the CAPTCHA
   */
  public generateRandomTone(): number {
    // Generate a frequency between 200-800 Hz, in a vocal comfortable range
    const min = 220; // Approximately A3
    const max = 440; // Approximately A4
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Detect pitch using YIN algorithm
   * Based on the paper: "YIN, a fundamental frequency estimator for speech and music"
   */
  private detectPitchYIN(audioData: Float32Array): {
    frequency: number;
    confidence: number;
  } {
    const threshold = 0.15;
    const bufferSize = audioData.length;
    const yinBuffer = new Float32Array(bufferSize / 2);

    // Step 1: Calculate difference function
    for (let t = 0; t < yinBuffer.length; t++) {
      yinBuffer[t] = 0;
      for (let i = 0; i < yinBuffer.length; i++) {
        const delta = audioData[i] - audioData[i + t];
        yinBuffer[t] += delta * delta;
      }
    }

    // Step 2: Cumulative mean normalized difference
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let t = 1; t < yinBuffer.length; t++) {
      runningSum += yinBuffer[t];
      yinBuffer[t] = (yinBuffer[t] * t) / runningSum;
    }

    // Step 3: Search for minima in cumulative mean normalized difference
    let foundTau = 0;
    let minValue = 1000; // Large initial value
    let confidence = 0;

    // Find first dip below threshold
    for (let t = 2; t < yinBuffer.length; t++) {
      if (
        yinBuffer[t] < threshold &&
        yinBuffer[t] < yinBuffer[t - 1] &&
        yinBuffer[t] < yinBuffer[t + 1]
      ) {
        if (yinBuffer[t] < minValue) {
          minValue = yinBuffer[t];
          foundTau = t;
          confidence = 1 - minValue; // Higher confidence with lower minima
        }
      }
    }

    // If no dip found, find absolute minima
    if (foundTau === 0) {
      for (let t = 2; t < yinBuffer.length; t++) {
        if (yinBuffer[t] < minValue) {
          minValue = yinBuffer[t];
          foundTau = t;
          confidence = 1 - minValue;
        }
      }
    }

    // Calculate frequency based on detected period
    const sampleRate = 44100; // Assuming 44.1kHz sample rate
    let frequency = 0;

    if (foundTau > 0) {
      // Improve frequency precision using parabolic interpolation
      const betterTau = this.parabolicInterpolation(yinBuffer, foundTau);
      frequency = sampleRate / betterTau;

      // Constrain to the min/max range
      if (
        frequency < this.options.minFrequency ||
        frequency > this.options.maxFrequency
      ) {
        frequency = 0;
        confidence = 0;
      }
    }

    return { frequency, confidence };
  }

  /**
   * Parabolic interpolation for improved frequency precision
   */
  private parabolicInterpolation(array: Float32Array, tau: number): number {
    // Edge cases
    if (tau < 1) return tau;
    if (tau >= array.length - 1) return tau;

    const y_prev = array[tau - 1];
    const y_curr = array[tau];
    const y_next = array[tau + 1];

    // Vertex of parabola fitting these three points
    const vertex_x =
      tau + (0.5 * (y_next - y_prev)) / (2 * y_curr - y_next - y_prev);
    return vertex_x;
  }

  /**
   * Calculate RMS amplitude from audio data
   */
  private getAmplitude(audioData: Float32Array): number {
    let sumSquares = 0;
    for (let i = 0; i < audioData.length; i++) {
      sumSquares += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sumSquares / audioData.length);
    return rms;
  }

  /**
   * Check for bot-like behavior in audio signals
   */
  private checkForBotBehavior(
    frequency: number,
    amplitude: number,
    confidence: number
  ): { isBotLike: boolean; botLikeReason?: string } {
    if (frequency === 0) return { isBotLike: false };
    // Check for unnaturally stable frequency

    if (this.recentFrequencies.length >= 5 && frequency > 0) {
      const recentValidFreqs = this.recentFrequencies
        .filter((f) => f > this.options.minFrequency)
        .slice(0, 5);

      if (recentValidFreqs.length >= 3) {
        // Calculate frequency variance
        const mean =
          recentValidFreqs.reduce((sum, f) => sum + f, 0) /
          recentValidFreqs.length;
        const variance =
          recentValidFreqs.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) /
          recentValidFreqs.length;
        const cv = Math.sqrt(variance) / mean; // Coefficient of variation
        // Human pitch typically has some micro-variations
        // If variance is extremely low, it might be synthetic
        if (cv < 0.001 && mean > 125) {
          return {
            isBotLike: true,
            botLikeReason: "Unnaturally stable frequency detected",
          };
        }

        this.pruneReplayBuffer();
        if (this.isReplayed(frequency, amplitude, confidence)) {
          return {
            isBotLike: true,
            botLikeReason: "Replayed audio",
          };
        }
      }
    }

    // Check for unnatural amplitude pattern
    const validAmplitudes = this.recentAmplitudes.filter((a) => a > 0.01);
    if (validAmplitudes.length >= 5) {
      // Calculate amplitude variance
      const mean =
        validAmplitudes.reduce((sum, a) => sum + a, 0) / validAmplitudes.length;
      const variance =
        validAmplitudes.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) /
        validAmplitudes.length;
      const cv = Math.sqrt(variance) / mean;

      // Human voice has natural amplitude variations
      if (cv < 0.01) {
        return {
          isBotLike: true,
          botLikeReason: "Unnaturally stable amplitude detected",
        };
      }
    }

    return { isBotLike: false };
  }
}

// Export a singleton instance with default options
export const defaultToneDetector = new ToneDetector();
