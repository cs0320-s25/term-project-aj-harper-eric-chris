import React, { useState, useEffect, useRef } from "react";
import PitchVisualizer from "./PitchVisualizer";
import { defaultToneDetector, DetectionResult } from "../../lib/toneDetector";

interface AudioCaptchaProps {
  onSuccess: (status: boolean | "timeout" | "failure") => void;
}

export function AudioCaptcha({ onSuccess }: AudioCaptchaProps) {
  // State for challenge data
  const [challengeId, setChallengeId] = useState<string>("");
  const [targetFrequency, setTargetFrequency] = useState<number>(0);
  const [currentToneIndex, setCurrentToneIndex] = useState(0);

  // State for microphone and audio context
  const [microphoneAccess, setMicrophoneAccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [microphoneReady, setMicrophoneReady] = useState(false);

  // State for challenge progress
  const [stage, setStage] = useState<
    | "initial"
    | "demo"
    | "recording"
    | "analyzing"
    | "success"
    | "failure"
    | "bot-detected"
    | "permission-error"
  >("initial");

  // Additional state for error messages
  const [failureMessage, setFailureMessage] = useState<string>("");
  const [botDetectionReason, setBotDetectionReason] = useState<string>("");

  // Tone detection results
  const [detectionResult, setDetectionResult] = useState<DetectionResult>({
    frequency: 0,
    amplitude: 0,
    confidenceScore: 0,
    isBotLike: false,
  });

  // Debug information
  const [recordingTimeLeft, setRecordingTimeLeft] = useState<number>(0);
  // Refs
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioDataRef = useRef<Float32Array | null>(null);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const matchStartTimeRef = useRef<number | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recordedFrequenciesRef = useRef<number[]>([]);
  const recordedResultsRef = useRef<DetectionResult[]>([]);
  const isRecordingRef = useRef(false);
  const successTriggeredRef = useRef(false); // Track if success has been triggered to prevent auto-pass to next round

  // Add a new state for initial stage
  const [showChallenge, setShowChallenge] = useState(false);

  // Initialize on mount
  useEffect(() => {
    initChallenge();
    // Clean up on unmount
    return () => {
      stopTone();
      cleanupAudio();
    };
  }, []);

  // Effect to continuously process audio when microphone is ready
  useEffect(() => {
    if (microphoneReady && stage === "recording") {
      console.log("Starting continuous audio processing");
      // Process audio at a reasonable interval
      processingIntervalRef.current = setInterval(processAudioData, 50);

      // Return cleanup function
      return () => {
        if (processingIntervalRef.current) {
          clearInterval(processingIntervalRef.current);
          processingIntervalRef.current = null;
        }
      };
    }
  }, [microphoneReady, stage]);

  // Effect to track when the user is maintaining the target pitch
  useEffect(() => {
    // Only check during recording
    if (!isRecording) {
      matchStartTimeRef.current = null;
      return;
    }

    // Check if current frequency matches the target
    if (
      defaultToneDetector.isFrequencyMatch(
        detectionResult.frequency,
        targetFrequency
      )
    ) {
      // If this is the start of a matching period, record the time
      if (matchStartTimeRef.current === null) {
        matchStartTimeRef.current = Date.now();
      }
      // If they've been matching for 2 seconds, end recording successfully
      else if (Date.now() - matchStartTimeRef.current >= 2000) {
        console.log("User maintained pitch for 2 seconds - ending recording");
        stopRecording(true);
      }
    } else {
      // Reset the match timer if they go off pitch
      matchStartTimeRef.current = null;
    }
  }, [detectionResult.frequency, isRecording, targetFrequency]);

  // Initialize a new challenge
  const initChallenge = async () => {
    try {
      // Generate a random challenge ID
      const randomId = Math.random().toString(36).substring(2, 15);
      setChallengeId(randomId);

      // Generate a random tone frequency
      const randomFrequency = defaultToneDetector.generateRandomTone();
      setTargetFrequency(randomFrequency);

      console.log(`Generated challenge with frequency: ${randomFrequency}Hz`);
    } catch (error) {
      console.error("Error initializing challenge:", error);
      setStage("failure");
      onSuccess("failure");
    }
  };

  // Function to play a tone
  const playTone = (frequency: number, duration = 1000) => {
    try {
      // Create a new temporary audio context for playing tones if needed
      const ctx =
        audioContext ||
        new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioContext) {
        setAudioContext(ctx);
      }

      const oscillator = ctx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start();
      gainNodeRef.current = gainNode;
      oscillatorRef.current = oscillator;

      // Schedule the tone to stop
      gainNode.gain.setValueAtTime(
        0.5,
        ctx.currentTime + duration / 1000 - 0.1
      );
      gainNode.gain.linearRampToValueAtTime(
        0,
        ctx.currentTime + duration / 1000
      );

      setTimeout(() => {
        stopTone();
      }, duration);
    } catch (error) {
      console.error("Error playing tone:", error);
    }
  };

  // Function to stop the current tone
  const stopTone = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      } catch (e) {
        console.error("Error stopping oscillator:", e);
      }
    }

    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      } catch (e) {
        console.error("Error disconnecting gain node:", e);
      }
    }
  };

  // Function to clean up audio resources
  const cleanupAudio = () => {
    console.log("Cleaning up audio resources");
    stopTone();

    // First disconnect any audio nodes
    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
        micSourceRef.current = null;
      } catch (e) {
        console.error("Error disconnecting microphone source:", e);
      }
    }

    // Stop any media streams
    if (streamRef.current) {
      console.log("Stopping audio tracks");
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear processing intervals
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }

    // Clear recording timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // Reset audio state
    setMicrophoneReady(false);
    setAudioAnalyser(null);
    setDetectionResult({
      frequency: 0,
      amplitude: 0,
      confidenceScore: 0,
      isBotLike: false,
    });
    setRecordingTimeLeft(0);
    matchStartTimeRef.current = null;

    // Do not reset audio context to avoid "The AudioContext was not allowed to start" errors on some browsers
    // setAudioContext(null);
  };

  // Play the demo tone sequence - this no longer initializes the microphone
  const playDemoSequence = () => {
    setStage("demo");
    setCurrentToneIndex(0);

    // Play the target tone
    playTone(targetFrequency, 2000);

    // After demo finishes, set the stage to recording so user can click record button
    // but don't start recording or initialize mic yet
    setTimeout(() => {
      setStage("recording");
    }, 2500);
  };

  // Initialize the microphone
  const initMicrophone = async () => {
    try {
      // First, clean up any existing audio resources to ensure a fresh start
      cleanupAudio();

      console.log("Initializing microphone");

      // Request microphone access with appropriate constraints for voice detection
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // Disable to better detect actual amplitude
        },
        video: false,
      });

      // Store the stream for later cleanup
      streamRef.current = stream;
      setMicrophoneAccess(true);

      // Create or reuse audio context
      const ctx =
        audioContext ||
        new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioContext) {
        setAudioContext(ctx);
      }

      // Create analyzer node
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048; // Larger FFT size for better frequency resolution
      analyser.smoothingTimeConstant = 0.3; // Less smoothing for more responsive display
      setAudioAnalyser(analyser);

      // Connect microphone to analyzer
      const source = ctx.createMediaStreamSource(stream);
      micSourceRef.current = source;
      source.connect(analyser);

      // Create data array for analyser
      audioDataRef.current = new Float32Array(analyser.fftSize);

      // Mark microphone as ready after setup is complete
      setMicrophoneReady(true);

      console.log("Microphone initialized successfully");
      return true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setMicrophoneAccess(false);
      setStage("permission-error");
      return false;
    }
  };

  // Process audio data using our toneDetector
  const processAudioData = () => {
    if (!audioAnalyser || !audioDataRef.current || !microphoneReady) {
      return;
    }

    try {
      // Get audio data from analyzer
      audioAnalyser.getFloatTimeDomainData(audioDataRef.current);

      // Process the audio data with our tone detector
      const result = defaultToneDetector.processAudioData(audioDataRef.current);

      // Apply a low-pass filter to the frequency to reduce jitter and create smoother visualization
      // Lowered amplitude threshold to detect quieter humming (0.01 -> 0.003)
      if (result.amplitude > 0.003) {
        // Update state with the result - implement a simple smoothing mechanism
        setDetectionResult((prev) => {
          // If we have a new valid frequency, use weighted average with previous value
          // to create smoother transitions (70% new value, 30% old value)
          const smoothedFrequency =
            result.frequency > 0
              ? 0.7 * result.frequency +
                0.3 * (prev.frequency || result.frequency)
              : prev.frequency;

          return {
            frequency: smoothedFrequency,
            amplitude: result.amplitude,
            confidenceScore: result.confidenceScore,
            isBotLike: result.isBotLike,
            botLikeReason: result.botLikeReason,
          };
        });
      } else {
        // Reset frequency to 0 if amplitude is too low (likely silence)
        setDetectionResult((prev) => ({
          ...prev,
          frequency: 0,
          amplitude: result.amplitude,
          confidenceScore: 0,
        }));
      }

      // During recording, store all detection results
      if (isRecordingRef.current && result.frequency > 0) {
        recordedFrequenciesRef.current.push(result.frequency);
        recordedResultsRef.current.push(result);

        // If bot-like behavior is detected, stop recording and mark as failure
        if (result.isBotLike) {
          console.log("Bot-like behavior detected:", result.botLikeReason);
          setBotDetectionReason(
            result.botLikeReason || "Synthetic audio detected"
          );
          stopRecording(false);
          setStage("bot-detected");
          onSuccess(true);
          return;
        }
      }
    } catch (error) {
      console.error("Error processing audio data:", error);
      // Don't fail completely on errors, just log them
    }
  };

  // Start recording - now also initializes microphone
  const startRecording = async () => {
    // Make sure microphone is initialized before recording
    if (!microphoneReady) {
      const micInitialized = await initMicrophone();
      if (!micInitialized) {
        return; // Failed to initialize microphone
      }

      // Give a small delay after mic initialization before starting to record
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Reset recording state
    recordedFrequenciesRef.current = [];
    recordedResultsRef.current = [];
    matchStartTimeRef.current = null;
    setIsRecording(true);

    // Set up a countdown from 10 seconds
    const maxRecordingTime = 10; // seconds
    setRecordingTimeLeft(maxRecordingTime);

    // Start countdown timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    recordingTimerRef.current = setInterval(() => {
      setRecordingTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          // Time's up, stop recording
          stopRecording(false);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    // Set a maximum recording time of 10 seconds
    setTimeout(() => {
      if (isRecordingRef.current) {
        console.log("Maximum recording time reached");
        stopRecording(false);
      }
    }, maxRecordingTime * 1000);
  };

  // Stop recording and proceed to analysis
  const stopRecording = (matchAchieved: boolean) => {
    // Clear recording timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setRecordingTimeLeft(0);

    // If recording was stopped because match was achieved, we can use that information
    if (matchAchieved) {
      console.log("Recording stopped - user achieved sustained match");
    }

    // Proceed to analysis
    analyzeRecording(matchAchieved);
  };

  // Analyze the recording
  const analyzeRecording = (matchAchieved: boolean) => {
    setStage("analyzing");

    try {
      console.log("All recorded frequencies:", recordedFrequenciesRef.current);

      // Check for bot-like behavior in the entire recording
      const botResults = recordedResultsRef.current.filter((r) => r.isBotLike);

      if (botResults.length > 0) {
        // Bot detected
        console.log("Bot detected:", botResults[0].botLikeReason);
        setBotDetectionReason(
          botResults[0].botLikeReason || "Synthetic audio detected"
        );
        setStage("bot-detected");
        onSuccess(true);
        return;
      }

      // If we already know the match was achieved, go straight to success
      if (matchAchieved) {
        // Prevent auto-pass to next round by checking if success was already triggered
        if (successTriggeredRef.current) return;
        successTriggeredRef.current = true;
        setStage("success");
        onSuccess(false);
        return;
      }
      // Otherwise, do a more thorough analysis of the recording
      // Check if there are at least 3 consecutive matching frequencies
      let consecutiveMatches = 0;
      let maxConsecutiveMatches = 0;

      for (const freq of recordedFrequenciesRef.current) {
        if (defaultToneDetector.isFrequencyMatch(freq, targetFrequency)) {
          consecutiveMatches++;
          maxConsecutiveMatches = Math.max(
            maxConsecutiveMatches,
            consecutiveMatches
          );
        } else {
          consecutiveMatches = 0;
        }
      }

      // Need at least 3 consecutive matching samples for a success
      if (maxConsecutiveMatches >= 3) {
        // Prevent auto-pass to next round by checking if success was already triggered
        if (successTriggeredRef.current) return;
        successTriggeredRef.current = true;
        setStage("success");
        onSuccess(false);
        return;
      } else {
        setFailureMessage(
          "We couldn't match your tone with the expected frequency"
        );
        setStage("failure");
        onSuccess("failure");
        return;
      }
    } catch (error: any) {
      console.error("Error during verification:", error);
      setFailureMessage("An error occurred during verification");
      setStage("failure");
      onSuccess("failure");
    } finally {
      // Always stop the processing interval and clean up audio after verification
      cleanupAudio();
    }
  };

  // Try again
  const handleRetry = () => {
    // Clean up
    cleanupAudio();

    // Reset all state
    setStage("initial");
    setCurrentToneIndex(0);
    setDetectionResult({
      frequency: 0,
      amplitude: 0,
      confidenceScore: 0,
      isBotLike: false,
    });
    setIsRecording(false);
    setRecordingTimeLeft(0);
    setFailureMessage("");
    setBotDetectionReason("");

    // Reset success triggered flag
    successTriggeredRef.current = false;

    // Clear any stored recordings
    recordedFrequenciesRef.current = [];
    recordedResultsRef.current = [];
    matchStartTimeRef.current = null;

    // Generate a completely new challenge with a new target frequency
    // This ensures it doesn't reuse the previous challenge data
    setTimeout(() => {
      initChallenge();
    }, 100);
  };

  // Start button handler - no longer initializes microphone
  const handleStart = async () => {
    setShowChallenge(true);
    playDemoSequence();
  };

  // Record button handler - now handles microphone initialization
  const handleRecord = async () => {
    await startRecording();
  };

  // Update the recording ref when state changes
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      {!showChallenge ? (
        <div className="text-center w-full">
          <h3 className="text-lg font-medium mb-2 text-center">
            Audio Tone Mimicry
          </h3>
          <p
            className="text-sm text-gray-600 dark:text-dark-700 mb-4 text-center"
            style={{ maxWidth: "380px", margin: "0 auto 1rem auto" }}
          >
            Listen to a tone and then mimic it with your voice. Hold the tone
            for a few seconds to verify you're human.
          </p>
          <button
            onClick={handleStart}
            className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-6 rounded-md transition-colors min-w-[160px]"
            aria-label="Start audio challenge"
          >
            Start
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 overflow-hidden rounded-lg aspect-[2/1] bg-gray-900 relative w-full">
            {/* Use the PitchVisualizer component */}
            <div className="w-full h-full">
              <PitchVisualizer
                userFrequency={detectionResult.frequency}
                targetFrequency={targetFrequency || 0}
                isRecording={isRecording}
                stage={stage}
              />
            </div>

            {/* Recording indicator with countdown */}
            {isRecording && (
              <div
                className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs flex items-center"
                aria-live="polite"
              >
                <span className="animate-pulse mr-1" aria-hidden="true">
                  ●
                </span>
                <span>
                  Recording{" "}
                  {recordingTimeLeft > 0 ? `(${recordingTimeLeft}s)` : ""}
                </span>
              </div>
            )}
          </div>

          {/* Instructions and controls */}
          <div className="space-y-4">
            {stage === "demo" && (
              <div
                className="bg-success-light dark:bg-success-dark p-4 rounded-md mb-4"
                aria-live="polite"
              >
                <p className="text-sm text-success dark:text-success">
                  Listen to the tone. You'll need to match it with your voice.
                </p>
              </div>
            )}

            {stage === "recording" && (
              <div>
                <div
                  className="bg-success-light dark:bg-success-dark p-4 rounded-md mb-4"
                  aria-live="polite"
                >
                  <p className="text-sm text-success dark:text-success">
                    <span className="font-semibold">Your turn:</span> Mimic the
                    tone you just heard. Maintain the correct pitch for 2
                    seconds to complete the challenge.
                  </p>
                </div>
                <button
                  onClick={handleRecord}
                  className={`w-full ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600"
                      : microphoneReady
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-blue-500 hover:bg-blue-600"
                  } text-white py-2 px-4 rounded-md transition-colors`}
                  disabled={isRecording}
                  aria-label={
                    isRecording
                      ? `Recording in progress (${recordingTimeLeft}s left)`
                      : microphoneReady
                      ? "Record your voice again"
                      : "Start recording your voice"
                  }
                >
                  {isRecording
                    ? `Recording (${recordingTimeLeft}s)`
                    : microphoneReady
                    ? "Record Again"
                    : "Start Recording"}
                </button>
              </div>
            )}

            {stage === "analyzing" && (
              <div className="text-center py-4" aria-live="polite">
                <div
                  className="w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin mx-auto mb-4"
                  role="status"
                  aria-label="Analyzing your tone"
                ></div>
                <p className="text-gray-600 dark:text-dark-700">
                  Analyzing your tone...
                </p>
              </div>
            )}

            {stage === "success" && (
              <div
                className="bg-green-50 dark:bg-green-900 p-4 rounded-md text-center"
                aria-live="polite"
              >
                <div className="text-green-500 mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2 text-green-700 dark:text-green-300">
                  Verification Successful!
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  You have successfully completed the audio tone challenge.
                </p>
              </div>
            )}

            {stage === "permission-error" && (
              <div
                className="bg-error-light dark:bg-error-dark p-4 rounded-md text-center"
                aria-live="assertive"
              >
                <div className="text-error mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2 text-error dark:text-error">
                  Microphone Access Required
                </h3>
                <p className="text-sm text-error dark:text-error mb-4">
                  Please allow microphone access to use the audio tone
                  verification. Your microphone is used only for verification
                  and no audio is stored.
                </p>
                <button
                  onClick={handleRetry}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-dark-300 dark:text-dark-900 dark:hover:bg-dark-400 px-4 py-2 rounded-md transition-colors"
                  aria-label="Try again with microphone access"
                >
                  Try Again
                </button>
              </div>
            )}

            {stage === "bot-detected" && (
              <div
                className="bg-error-light dark:bg-error-dark p-4 rounded-md text-center"
                aria-live="assertive"
              >
                <div className="text-error mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2 text-error dark:text-error">
                  Verification Failed
                </h3>
                <p className="text-sm text-error dark:text-error mb-4">
                  Synthetic/computer-generated audio detected.
                </p>
                <p className="text-xs text-error dark:text-error mb-2">
                  Human verification required. Please reload the page to try
                  again.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Default export for compatibility
export default AudioCaptcha;
