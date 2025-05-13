// Main entry point for the library
// Export all components that should be available to consumers

// Core components
export { AudioCaptcha } from "./components/audio-captcha/audio-captcha";
export { ExpressionSequence } from "./components/facial-captcha/facial-captcha";

// Utility components
export { default as PitchVisualizer } from "./components/audio-captcha/PitchVisualizer";

// Main component (wraps everything for easy use)
export { MimicCaptcha } from "./components/MimicCaptcha";
