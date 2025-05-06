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
  const deviation = Math.abs(recorded - expected);
  const allowedDeviation = expected * tolerance;

  if (deviation > allowedDeviation) {
    return 0; // No match
  }

  // Calculate confidence score based on how close the match is
  return 1 - deviation / allowedDeviation;
};

module.exports = {
  generateToneBuffer,
  isFrequencyMatch,
  calculateMatchConfidence,
};
