/**
 * MimiCaptcha - A customizable human verification captcha component
 *
 * Main components and types exports
 */
// Export main component
export {
  MimiCaptcha,
  type MimiCaptchaProps,
} from "./components/MimiCaptcha";

// Export individual components for advanced usage
export { AudioCaptcha } from "./components/audio-captcha/audio-captcha";
export { ExpressionSequence } from "./components/facial-captcha/facial-captcha";
export { PitchVisualizer } from "./components/audio-captcha/PitchVisualizer";

// Export utility functions
export {
  ToneDetector,
  defaultToneDetector,
  type DetectionResult,
  type ToneDetectorOptions,
} from "./lib/toneDetector";

export {
  loadTensorFlow,
  initializeFaceDetector,
  type TensorFlowLoadingStatus,
} from "./lib/tensorflow-loader";
