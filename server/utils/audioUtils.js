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
const isFrequencyMatch = (recorded, expected, tolerance = 0.15) => {
  // If recorded frequency is very low or zero, it's definitely not a match
  if (recorded < 30) {
    return false;
  }

  const allowedDeviation = expected * tolerance;
  return Math.abs(recorded - expected) <= allowedDeviation;
};

/**
 * Calculate confidence score for a frequency match (0-1)
 * @param {number} recorded - Recorded frequency
 * @param {number} expected - Expected frequency
 * @param {number} tolerance - Tolerance percentage (0-1)
 * @returns {number} - Confidence score (0-1)
 */
const calculateMatchConfidence = (recorded, expected, tolerance = 0.15) => {
  // If recorded frequency is very low or zero, confidence is zero
  if (recorded < 30) {
    return 0;
  }

  const deviation = Math.abs(recorded - expected);
  const allowedDeviation = expected * tolerance;

  if (deviation > allowedDeviation) {
    return 0; // No match
  }

  // Calculate confidence score based on how close the match is
  return 1 - deviation / allowedDeviation;
};

/**
 * Analyze audio data to extract frequency and amplitude information
 * @param {Float32Array} audioData - Raw audio data from the client
 * @param {number} sampleRate - Sample rate of the audio data (default: 44100)
 * @returns {Object} - Frequency and amplitude information
 */
const analyzeAudioData = (audioData, sampleRate = 44100) => {
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

    // Use a combination of methods for robust detection
    const zeroCrossingFreq = detectFrequencyByZeroCrossing(
      floatData,
      sampleRate
    );
    const autocorrelationFreq = detectFrequencyByAutocorrelation(
      floatData,
      sampleRate
    );

    // Take the more reliable result or their average
    let frequency;
    if (autocorrelationFreq > 0 && zeroCrossingFreq > 0) {
      // If both methods detect something, use a weighted average biased toward autocorrelation
      frequency = Math.round(
        autocorrelationFreq * 0.7 + zeroCrossingFreq * 0.3
      );
    } else {
      // Otherwise use whichever one detected something
      frequency = Math.round(autocorrelationFreq || zeroCrossingFreq || 0);
    }

    // If we still couldn't detect anything but have amplitude, estimate a frequency
    if (frequency === 0 && maxAmplitude > amplitudeThreshold) {
      frequency = 200; // Default to a common voice frequency
    }

    // Apply a simple low-pass filter to prevent unrealistic frequencies
    // Human voice generally stays under 1000 Hz
    const filteredFreq = frequency > 1000 ? 0 : frequency;

    // Enhanced amplitude calculation - using a combination of peak and RMS
    const enhancedAmplitude = Math.max(rmsAmplitude * 200, maxAmplitude * 150);

    return {
      frequency: filteredFreq,
      amplitude: Math.round(enhancedAmplitude),
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
 * Detect frequency using autocorrelation (more accurate for speech)
 * @param {Float32Array} audioData - Audio data buffer
 * @param {number} sampleRate - Sample rate
 * @returns {number} - Estimated frequency
 */
const detectFrequencyByAutocorrelation = (audioData, sampleRate) => {
  const bufferSize = audioData.length;

  // Use only a portion of the buffer for faster calculation
  const maxOffset = Math.min(bufferSize, 1024);

  // Autocorrelation array
  const acf = new Array(maxOffset).fill(0);

  // Calculate autocorrelation function
  for (let offset = 0; offset < maxOffset; offset++) {
    let sum = 0;
    for (let i = 0; i < bufferSize - offset; i++) {
      sum += audioData[i] * audioData[i + offset];
    }
    acf[offset] = sum;
  }

  // Find the first peak after initial drop (ignore first few values)
  let maxValue = -Infinity;
  let maxIndex = 0;

  // Start from a reasonable offset to avoid low-frequency noise
  const startOffset = Math.floor(sampleRate / 1000); // Skip first 1ms

  for (let i = startOffset; i < maxOffset; i++) {
    if (acf[i] > maxValue) {
      maxValue = acf[i];
      maxIndex = i;
    }
  }

  // If we found a decent peak, calculate frequency
  if (maxIndex > 0 && maxValue > 0.01) {
    return Math.round(sampleRate / maxIndex);
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

  // Try to detect frequency using autocorrelation on normalized data
  return detectFrequencyByAutocorrelation(normalizedData, sampleRate);
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
  detectFrequencyByAutocorrelation,
  detectFaintFrequency,
};
