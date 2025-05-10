/**
 * Utility functions for audio processing
 */

/**
 * Generate a WAV file buffer with a sine wave at the specified frequency
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {number} sampleRate - Sample rate (default: 44100)
 * @returns {Buffer} - WAV file buffer
 */
const generateToneBuffer = (frequency, duration = 2, sampleRate = 44100) => {
  // Calculate buffer size
  const bufferSize = sampleRate * duration;
  const audioBuffer = Buffer.alloc(44 + bufferSize * 2); // 44 bytes for WAV header + 2 bytes per sample

  // Write WAV header (44 bytes)
  // RIFF chunk descriptor
  audioBuffer.write("RIFF", 0);
  audioBuffer.writeUInt32LE(36 + bufferSize * 2, 4); // Chunk size
  audioBuffer.write("WAVE", 8);

  // FMT sub-chunk
  audioBuffer.write("fmt ", 12);
  audioBuffer.writeUInt32LE(16, 16); // Sub-chunk size (16 for PCM)
  audioBuffer.writeUInt16LE(1, 20); // Audio format (1 for PCM)
  audioBuffer.writeUInt16LE(1, 22); // Number of channels
  audioBuffer.writeUInt32LE(sampleRate, 24); // Sample rate
  audioBuffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  audioBuffer.writeUInt16LE(2, 32); // Block align
  audioBuffer.writeUInt16LE(16, 34); // Bits per sample

  // Data sub-chunk
  audioBuffer.write("data", 36);
  audioBuffer.writeUInt32LE(bufferSize * 2, 40); // Sub-chunk size

  // Write sine wave data
  for (let i = 0; i < bufferSize; i++) {
    const sampleValue =
      Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 32767;
    audioBuffer.writeInt16LE(Math.floor(sampleValue), 44 + i * 2);
  }

  return audioBuffer;
};

/**
 * Analyze a frequency to determine if it matches the expected frequency
 * @param {number} recorded - Recorded frequency
 * @param {number} expected - Expected frequency
 * @param {number} tolerance - Tolerance percentage (0-1)
 * @returns {boolean} - Whether frequencies match within tolerance
 */
const isFrequencyMatch = (recorded, expected, tolerance = 0.25) => {
  // If recorded frequency is very low or zero, it's definitely not a match
  if (recorded < 20) {
    return false;
  }

  // First check direct match with tolerance
  const allowedDeviation = expected * tolerance;
  if (Math.abs(recorded - expected) <= allowedDeviation) {
    return true;
  }

  // Check octave matches (double or half the frequency) — only up or down one so that it doesn't unnecessarily accept a bad match.
  // Check if recorded is an octave up from expected
  if (Math.abs(recorded - expected * 2) <= expected * 2 * tolerance) {
    return true;
  }

  // Check if recorded is an octave down from expected
  if (Math.abs(recorded - expected / 2) <= (expected / 2) * tolerance) {
    return true;
  }

  return false;
};

/**
 * Calculate confidence score for a frequency match (0-1)
 * @param {number} recorded - Recorded frequency
 * @param {number} expected - Expected frequency
 * @param {number} tolerance - Tolerance percentage (0-1)
 * @returns {number} - Confidence score (0-1)
 */
const calculateMatchConfidence = (recorded, expected, tolerance = 0.25) => {
  // If recorded frequency is very low or zero, confidence is zero
  if (recorded < 20) {
    return 0;
  }

  // Check direct match
  const deviation = Math.abs(recorded - expected);
  const allowedDeviation = expected * tolerance;

  if (deviation <= allowedDeviation) {
    // Calculate confidence score based on how close the match is
    // Use a non-linear scale to be more forgiving with slight deviations
    const normalizedDeviation = deviation / allowedDeviation;
    return Math.pow(1 - normalizedDeviation, 0.7); // Power < 1 makes the curve more lenient
  }

  // Check octave up match
  const octaveUpDeviation = Math.abs(recorded - expected * 2);
  const octaveUpAllowedDeviation = expected * 2 * tolerance;

  if (octaveUpDeviation <= octaveUpAllowedDeviation) {
    const normalizedDeviation = octaveUpDeviation / octaveUpAllowedDeviation;
    return Math.pow(1 - normalizedDeviation, 0.7) * 0.95; // Slightly lower confidence for octave matches
  }

  // Check octave down match
  const octaveDownDeviation = Math.abs(recorded - expected / 2);
  const octaveDownAllowedDeviation = (expected / 2) * tolerance;

  if (octaveDownDeviation <= octaveDownAllowedDeviation) {
    const normalizedDeviation =
      octaveDownDeviation / octaveDownAllowedDeviation;
    return Math.pow(1 - normalizedDeviation, 0.7) * 0.95; // Slightly lower confidence for octave matches
  }

  return 0; // No match
};

// Recent frequency history for smoothing and bot detection
const frequencyHistory = new Map(); // challengeId -> array of frequency readings
const frequencyStats = new Map(); // challengeId -> statistics for bot detection

/**
 * Clear frequency history for a specific challenge
 * @param {string} challengeId - Challenge ID
 */
const clearFrequencyHistory = (challengeId) => {
  frequencyHistory.delete(challengeId);
  frequencyStats.delete(challengeId);
};

/**
 * Updates frequency statistics for bot detection
 * @param {string} challengeId - Challenge ID
 * @param {number} frequency - Current frequency
 * @param {number} amplitude - Current amplitude
 * @returns {Object} - Current statistics
 */
const updateFrequencyStats = (challengeId, frequency, amplitude) => {
  // Initialize stats if needed
  if (!frequencyStats.has(challengeId)) {
    frequencyStats.set(challengeId, {
      frequencies: [],
      amplitudes: [],
      freqVariance: 0,
      ampVariance: 0,
      jitter: 0,
      naturalness: 1.0, // 1.0 = natural, 0.0 = synthetic
      count: 0,
    });
  }

  const stats = frequencyStats.get(challengeId);

  // Only use non-zero frequencies for statistics
  if (frequency > 0) {
    // Store the frequency and amplitude (limited history)
    stats.frequencies.push(frequency);
    stats.amplitudes.push(amplitude);

    // Keep a reasonable history length
    if (stats.frequencies.length > 20) {
      stats.frequencies.shift();
      stats.amplitudes.shift();
    }

    // Need at least 5 samples to calculate meaningful statistics
    if (stats.frequencies.length >= 5) {
      // Calculate frequency variance - natural voice has higher variance
      const freqMean =
        stats.frequencies.reduce((sum, f) => sum + f, 0) /
        stats.frequencies.length;
      stats.freqVariance = Math.sqrt(
        stats.frequencies.reduce(
          (sum, f) => sum + Math.pow(f - freqMean, 2),
          0
        ) / stats.frequencies.length
      );

      // Calculate amplitude variance - natural voice has varying amplitude
      const ampMean =
        stats.amplitudes.reduce((sum, a) => sum + a, 0) /
        stats.amplitudes.length;
      stats.ampVariance = Math.sqrt(
        stats.amplitudes.reduce((sum, a) => sum + Math.pow(a - ampMean, 2), 0) /
          stats.amplitudes.length
      );

      // Calculate jitter (frequency changes between consecutive samples)
      let totalJitter = 0;
      for (let i = 1; i < stats.frequencies.length; i++) {
        totalJitter += Math.abs(
          stats.frequencies[i] - stats.frequencies[i - 1]
        );
      }
      stats.jitter = totalJitter / (stats.frequencies.length - 1);

      // Human voices have natural frequency and amplitude variations
      // Calculate naturalness score (0-1 scale where higher is more human-like)
      const freqVarianceWeight = 0.4;
      const ampVarianceWeight = 0.3;
      const jitterWeight = 0.3;

      // Normalize values based on expected human ranges
      const normalizedFreqVar = Math.min(stats.freqVariance / 10, 1); // Human voice freq typically varies by ~5-15 Hz
      const normalizedAmpVar = Math.min(stats.ampVariance / 30, 1); // Human amplitude varies by ~10-50 units
      const normalizedJitter = Math.min(stats.jitter / 5, 1); // Human jitter typically 2-8 Hz between samples

      stats.naturalness =
        normalizedFreqVar * freqVarianceWeight +
        normalizedAmpVar * ampVarianceWeight +
        normalizedJitter * jitterWeight;
    }

    stats.count++;
  }

  return stats;
};

/**
 * Detects if the audio is likely from a bot/synthetic source
 * @param {string} challengeId - Challenge ID
 * @returns {Object} - Detection result with probability and reason
 */
const detectSyntheticAudio = (challengeId) => {
  if (!frequencyStats.has(challengeId)) {
    return { isSynthetic: false, confidence: 0, reason: "Insufficient data" };
  }

  const stats = frequencyStats.get(challengeId);

  // Need sufficient data for reliable detection
  if (stats.count < 8) {
    return { isSynthetic: false, confidence: 0, reason: "Insufficient data" };
  }

  // Calculate bot probability based on naturalness score
  const botProbability = 1 - stats.naturalness;

  // Determine reason for detection
  let reason = "Natural human voice detected";
  if (botProbability > 0.8) {
    if (stats.freqVariance < 2) {
      reason = "Unnaturally stable frequency detected";
    } else if (stats.ampVariance < 5) {
      reason = "Unnaturally stable amplitude detected";
    } else if (stats.jitter < 0.5) {
      reason = "Unnatural voice pattern detected";
    } else {
      reason = "Synthetic audio pattern detected";
    }
  }

  return {
    isSynthetic: botProbability > 0.8,
    confidence: botProbability,
    reason: reason,
    stats: {
      freqVariance: stats.freqVariance,
      ampVariance: stats.ampVariance,
      jitter: stats.jitter,
      naturalness: stats.naturalness,
    },
  };
};

/**
 * Analyze audio data to extract frequency and amplitude information
 * @param {Float32Array} audioData - Raw audio data from the client
 * @param {number} sampleRate - Sample rate of the audio data (default: 44100)
 * @param {string} challengeId - Challenge ID for tracking history
 * @returns {Object} - Frequency and amplitude information
 */
const analyzeAudioData = (
  audioData,
  sampleRate = 44100,
  challengeId = null
) => {
  try {
    // Convert data if it's not already a Float32Array
    const floatData = Array.isArray(audioData)
      ? new Float32Array(audioData)
      : audioData;

    // Get the number of samples
    const bufferSize = floatData.length;

    // Ensure we have enough data for analysis
    if (bufferSize < 512) {
      return {
        frequency: 100, // Return a default value instead of 0
        amplitude: 5, // Return a minimal amplitude instead of 0
        error: "Insufficient audio data for analysis",
      };
    }

    // First, measure amplitude
    let maxAmplitude = 0;
    let sumSquares = 0;
    for (let i = 0; i < bufferSize; i++) {
      const absValue = Math.abs(floatData[i]);
      if (absValue > maxAmplitude) {
        maxAmplitude = absValue;
      }
      sumSquares += floatData[i] * floatData[i];
    }

    // Calculate RMS amplitude (more sensitive than peak)
    const rmsAmplitude = Math.sqrt(sumSquares / bufferSize);

    // Lower the amplitude threshold significantly to be more sensitive
    const amplitudeThreshold = 0.001; // Reduced from 0.01

    // If amplitude is too low, still try to detect something
    if (maxAmplitude < amplitudeThreshold) {
      // Look for even faint signals
      let faintFreq = detectFaintFrequency(floatData, sampleRate);

      return {
        frequency: faintFreq || 0,
        amplitude: Math.max(rmsAmplitude * 500, maxAmplitude * 300), // Amplify the display value
        quality: "low",
      };
    }

    // Use a combination of improved detection methods
    // 1. Zero-crossing for quick estimation
    const zeroCrossingFreq = detectFrequencyByZeroCrossing(
      floatData,
      sampleRate
    );

    // 2. Enhanced autocorrelation (more accurate for complex tones)
    const autocorrelationFreq = detectFrequencyByEnhancedAutocorrelation(
      floatData,
      sampleRate
    );

    // 3. YIN algorithm - industry standard pitch detection (more CPU intensive)
    const yinFreq = detectFrequencyByYIN(floatData, sampleRate);

    // Combine the results with weighted average based on confidence
    let rawFrequency = 0;
    let totalWeight = 0;

    // Only include non-zero frequencies in the weighted average
    if (zeroCrossingFreq > 0) {
      rawFrequency += zeroCrossingFreq * 1; // Lowest weight
      totalWeight += 1;
    }

    if (autocorrelationFreq > 0) {
      rawFrequency += autocorrelationFreq * 2; // Medium weight
      totalWeight += 2;
    }

    if (yinFreq > 0) {
      rawFrequency += yinFreq * 3; // Highest weight
      totalWeight += 3;
    }

    // Calculate final frequency or default to 0
    rawFrequency = totalWeight > 0 ? Math.round(rawFrequency / totalWeight) : 0;

    // If we still couldn't detect anything but have amplitude, estimate a frequency
    if (rawFrequency === 0 && maxAmplitude > amplitudeThreshold) {
      rawFrequency = 200; // Default to a common voice frequency
    }

    // Apply a simple low-pass filter to prevent unrealistic frequencies
    // Human voice generally stays under 1000 Hz
    let filteredFreq = rawFrequency > 1000 ? 0 : rawFrequency;

    // Smooth the frequency using a moving average if we have a challenge ID
    if (challengeId) {
      filteredFreq = smoothFrequency(filteredFreq, challengeId);
    }

    // Quantize the frequency to further reduce fluctuations
    // Round to nearest 3Hz for better stability
    filteredFreq = Math.round(filteredFreq / 3) * 3;

    // Enhanced amplitude calculation - using a combination of peak and RMS
    const enhancedAmplitude = Math.max(rmsAmplitude * 200, maxAmplitude * 150);
    const finalAmplitude = Math.round(enhancedAmplitude);

    // Update frequency stats for bot detection if we have a challenge ID
    if (challengeId) {
      updateFrequencyStats(challengeId, filteredFreq, finalAmplitude);
    }

    return {
      frequency: filteredFreq,
      amplitude: finalAmplitude,
      rawFrequency: rawFrequency, // Include raw value for debugging
      quality: maxAmplitude > 0.01 ? "high" : "medium",
    };
  } catch (error) {
    console.error("Error analyzing audio data:", error);
    return {
      frequency: 100, // Again, return a default instead of 0
      amplitude: 5,
      error: error.message,
      quality: "error",
    };
  }
};

/**
 * Smooth frequency values using a moving average
 * @param {number} frequency - Current frequency reading
 * @param {string} challengeId - Challenge ID for tracking history
 * @returns {number} - Smoothed frequency
 */
const smoothFrequency = (frequency, challengeId) => {
  // Initialize history if needed
  if (!frequencyHistory.has(challengeId)) {
    frequencyHistory.set(challengeId, []);
  }

  const history = frequencyHistory.get(challengeId);

  // Add current reading to history (up to 10 readings)
  history.push(frequency);
  if (history.length > 10) {
    history.shift();
  }

  // If there's only one reading or the frequency is 0, return as is
  if (history.length === 1 || frequency === 0) {
    return frequency;
  }

  // Calculate weighted moving average with more weight to recent readings
  let weightedSum = 0;
  let weightSum = 0;
  const nonZeroValues = history.filter((f) => f > 0);

  // If we have no valid readings, return the current one
  if (nonZeroValues.length === 0) {
    return frequency;
  }

  // Use only non-zero readings for the average
  for (let i = 0; i < nonZeroValues.length; i++) {
    // More recent readings get higher weights
    const weight = 1 + i;
    weightedSum += nonZeroValues[i] * weight;
    weightSum += weight;
  }

  return Math.round(weightedSum / weightSum);
};

/**
 * Detect frequency using zero-crossing method
 * @param {Float32Array} audioData - Audio data buffer
 * @param {number} sampleRate - Sample rate
 * @returns {number} - Estimated frequency
 */
const detectFrequencyByZeroCrossing = (audioData, sampleRate) => {
  let zeroCrossings = 0;
  let prevSample = audioData[0];

  // Count zero crossings
  for (let i = 1; i < audioData.length; i++) {
    const sample = audioData[i];
    if ((prevSample < 0 && sample >= 0) || (prevSample >= 0 && sample < 0)) {
      zeroCrossings++;
    }
    prevSample = sample;
  }

  // Each zero crossing represents half a cycle
  // Apply a correction factor for noise (0.9)
  if (zeroCrossings > 0) {
    return Math.round(
      (zeroCrossings * sampleRate * 0.9) / (2 * audioData.length)
    );
  }

  return 0;
};

/**
 * Detect frequency using enhanced autocorrelation (more accurate for speech)
 * @param {Float32Array} audioData - Audio data buffer
 * @param {number} sampleRate - Sample rate
 * @returns {number} - Estimated frequency
 */
const detectFrequencyByEnhancedAutocorrelation = (audioData, sampleRate) => {
  const bufferSize = audioData.length;

  // Use a reasonably sized buffer for analysis
  const maxOffset = Math.min(bufferSize, 1024);

  // Autocorrelation array
  const acf = new Array(maxOffset).fill(0);

  // Calculate normalized autocorrelation function (NACF)
  for (let offset = 0; offset < maxOffset; offset++) {
    let sum = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;

    for (let i = 0; i < bufferSize - offset; i++) {
      const val1 = audioData[i];
      const val2 = audioData[i + offset];

      sum += val1 * val2;
      sumSq1 += val1 * val1;
      sumSq2 += val2 * val2;
    }

    // Normalized autocorrelation
    acf[offset] = sumSq1 && sumSq2 ? sum / Math.sqrt(sumSq1 * sumSq2) : 0;
  }

  // Skip first few values to avoid low-frequency noise
  const startOffset = Math.floor(sampleRate / 1000); // Skip first 1ms

  // Find peaks in autocorrelation
  const peaks = [];
  for (let i = startOffset + 1; i < maxOffset - 1; i++) {
    if (acf[i] > acf[i - 1] && acf[i] > acf[i + 1] && acf[i] > 0.2) {
      // Threshold for a "significant" peak
      peaks.push({ index: i, value: acf[i] });
    }
  }

  // Sort peaks by correlation value
  peaks.sort((a, b) => b.value - a.value);

  // Use the highest peak for frequency estimation
  if (peaks.length > 0) {
    return Math.round(sampleRate / peaks[0].index);
  }

  return 0;
};

/**
 * Detect frequency using the YIN algorithm (improved pitch detection)
 * @param {Float32Array} audioData - Audio data buffer
 * @param {number} sampleRate - Sample rate
 * @returns {number} - Estimated frequency
 */
const detectFrequencyByYIN = (audioData, sampleRate) => {
  const bufferSize = audioData.length;
  const maxPeriod = Math.min(bufferSize / 2, 1024); // Maximum period to check

  // Step 1: Calculate difference function
  const diff = new Array(maxPeriod).fill(0);
  for (let tau = 0; tau < maxPeriod; tau++) {
    for (let i = 0; i < bufferSize - maxPeriod; i++) {
      const delta = audioData[i] - audioData[i + tau];
      diff[tau] += delta * delta;
    }
  }

  // Step 2: Cumulative normalization
  const cumulativeMean = new Array(maxPeriod).fill(0);
  cumulativeMean[0] = 1; // Avoid division by zero

  for (let tau = 1; tau < maxPeriod; tau++) {
    let sum = 0;
    for (let i = 0; i < tau; i++) {
      sum += diff[i];
    }
    cumulativeMean[tau] = (diff[tau] * tau) / sum;
  }

  // Step 3: Find the first minimum below threshold
  const threshold = 0.15; // Typical YIN threshold
  let minTau = 0;
  let minVal = 1.0;

  // Start at a reasonable lower bound to avoid very high frequencies
  const minPeriod = Math.floor(sampleRate / 1000); // Avoid frequencies above 1000Hz

  for (let tau = minPeriod; tau < maxPeriod; tau++) {
    if (cumulativeMean[tau] < threshold) {
      // Earliest point below threshold
      minTau = tau;
      minVal = cumulativeMean[tau];
      break;
    } else if (cumulativeMean[tau] < minVal) {
      // Local minimum
      minTau = tau;
      minVal = cumulativeMean[tau];
    }
  }

  // Step 4: Interpolate for better accuracy
  if (minTau > 0 && minTau < maxPeriod - 1) {
    const y1 = cumulativeMean[minTau - 1];
    const y2 = cumulativeMean[minTau];
    const y3 = cumulativeMean[minTau + 1];

    // Parabolic interpolation
    const a = (y3 - 2 * y2 + y1) / 2;
    const b = (y3 - y1) / 2;

    if (a !== 0) {
      const correction = -b / (2 * a);
      minTau += correction;
    }
  }

  // Calculate frequency from period
  const frequency = minTau > 0 ? sampleRate / minTau : 0;

  // Ensure the frequency is in the human voice range
  if (frequency >= 75 && frequency <= 1000) {
    return Math.round(frequency);
  }

  return 0;
};

/**
 * Attempt to detect even faint frequency signals
 * @param {Float32Array} audioData - Audio data buffer
 * @param {number} sampleRate - Sample rate
 * @returns {number} - Estimated frequency or 0
 */
const detectFaintFrequency = (audioData, sampleRate) => {
  // Normalize the data to enhance faint signals
  const normalizedData = new Float32Array(audioData.length);

  // Find the maximum absolute value in the buffer
  let maxAbs = 0;
  for (let i = 0; i < audioData.length; i++) {
    const absVal = Math.abs(audioData[i]);
    if (absVal > maxAbs) maxAbs = absVal;
  }

  // If signal is extremely weak, it's probably just noise
  if (maxAbs < 0.0005) return 0;

  // Normalize data to range [-1, 1]
  for (let i = 0; i < audioData.length; i++) {
    normalizedData[i] = audioData[i] / maxAbs;
  }

  // Try each detection method
  const freqs = [
    detectFrequencyByEnhancedAutocorrelation(normalizedData, sampleRate),
    detectFrequencyByYIN(normalizedData, sampleRate),
  ].filter((f) => f > 0);

  // Return the average of valid frequencies
  if (freqs.length > 0) {
    return Math.round(freqs.reduce((sum, f) => sum + f, 0) / freqs.length);
  }

  return 0;
};

/**
 * Generate waveform data points for visualization
 * @param {Float32Array} audioData - Raw audio data from the client
 * @param {number} width - Width of the visualization canvas
 * @param {number} height - Height of the visualization canvas
 * @returns {Array} - Array of {x, y} points for drawing the waveform
 */
const generateWaveformData = (audioData, width = 600, height = 300) => {
  try {
    // Convert data if it's not already a Float32Array
    const floatData = Array.isArray(audioData)
      ? new Float32Array(audioData)
      : audioData;

    // Get the number of samples
    const bufferSize = floatData.length;

    // If no data or too little data, return a flat line
    if (bufferSize < 100) {
      const centerY = height / 2;
      return Array.from({ length: width }, (_, x) => ({ x, y: centerY }));
    }

    // Figure out how many samples to skip to cover the width
    const skip = Math.max(1, Math.floor(bufferSize / width));

    // Find max amplitude to scale the visualization
    let maxAmplitude = 0;
    for (let i = 0; i < bufferSize; i++) {
      const absValue = Math.abs(floatData[i]);
      if (absValue > maxAmplitude) {
        maxAmplitude = absValue;
      }
    }

    // Increase sensitivity - use a minimum amplitude for visualization
    maxAmplitude = Math.max(maxAmplitude, 0.001);

    // Scale factor to fit within canvas height with some padding
    // Make the scaling more aggressive to show even faint sounds
    const scaleFactor = (height * 0.6) / maxAmplitude;
    const centerY = height / 2;

    // Generate points for the waveform
    const points = [];
    for (let x = 0; x < width; x++) {
      const sampleIndex = Math.min(x * skip, bufferSize - 1);
      const y = centerY - floatData[sampleIndex] * scaleFactor;
      points.push({ x, y });
    }

    return points;
  } catch (error) {
    console.error("Error generating waveform data:", error);
    // Return a flat line in case of error
    const centerY = height / 2;
    return Array.from({ length: width }, (_, x) => ({ x, y: centerY }));
  }
};

module.exports = {
  generateToneBuffer,
  isFrequencyMatch,
  calculateMatchConfidence,
  analyzeAudioData,
  generateWaveformData,
  detectFrequencyByZeroCrossing,
  detectFrequencyByEnhancedAutocorrelation,
  detectFrequencyByYIN,
  detectFaintFrequency,
  clearFrequencyHistory,
  detectSyntheticAudio,
  updateFrequencyStats,
};
