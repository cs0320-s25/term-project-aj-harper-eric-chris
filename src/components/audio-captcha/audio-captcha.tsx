"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  generateAudioChallenge,
  getAudioTone,
  processAudio,
  verifyAudioResponse,
} from "../../lib/audioCaptchaApi";

interface AudioCaptchaProps {
  onSuccess: () => void;
}

const AudioCaptcha: React.FC<AudioCaptchaProps> = ({ onSuccess }) => {
  // State for challenge data
  const [challengeId, setChallengeId] = useState<string>("");
  const [toneSequence, setToneSequence] = useState<number[]>([]);
  const [currentToneIndex, setCurrentToneIndex] = useState(0);

  // State for microphone and audio context
  const [microphoneAccess, setMicrophoneAccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [microphoneReady, setMicrophoneReady] = useState(false);

  // State for challenge progress
  const [stage, setStage] = useState<
    "initial" | "demo" | "recording" | "analyzing" | "success" | "failure"
  >("initial");

  // Debug information
  const [showDebug, setShowDebug] = useState(true);
  const [userFrequency, setUserFrequency] = useState<number>(0);
  const [userAmplitude, setUserAmplitude] = useState<number>(0);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [lastProcessedAt, setLastProcessedAt] = useState<number>(0);

  // Refs
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioDataRef = useRef<Float32Array | null>(null);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recordedFrequenciesRef = useRef<number[]>([]);
  const isRecordingRef = useRef(false);

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
    if (microphoneReady && challengeId) {
      console.log("Starting continuous audio processing");
      // Start continuous audio processing (every 100ms for more responsiveness)
      processingIntervalRef.current = setInterval(processAudioData, 100);

      // Return cleanup function
      return () => {
        if (processingIntervalRef.current) {
          clearInterval(processingIntervalRef.current);
          processingIntervalRef.current = null;
        }
      };
    }
  }, [microphoneReady, challengeId]);

  // Initialize a new challenge
  const initChallenge = async () => {
    try {
      // Generate a new challenge
      const challenge = await generateAudioChallenge();
      setChallengeId(challenge.challengeId);

      // Get the tone data
      const toneData = await getAudioTone(challenge.challengeId);
      setToneSequence([toneData.frequency]);

      console.log(`Generated tone with frequency: ${toneData.frequency}Hz`);
    } catch (error) {
      console.error("Error initializing challenge:", error);
      setStage("failure");
    }
  };

  // Function to play a tone
  const playTone = (frequency: number, duration = 1000) => {
    if (!audioContext) {
      const newAudioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      setAudioContext(newAudioContext);

      const oscillator = newAudioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        frequency,
        newAudioContext.currentTime
      );

      const gainNode = newAudioContext.createGain();
      gainNode.gain.setValueAtTime(0, newAudioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0.5,
        newAudioContext.currentTime + 0.1
      );

      oscillator.connect(gainNode);
      gainNode.connect(newAudioContext.destination);

      oscillator.start();
      gainNodeRef.current = gainNode;
      oscillatorRef.current = oscillator;

      // Schedule the tone to stop
      gainNode.gain.setValueAtTime(
        0.5,
        newAudioContext.currentTime + duration / 1000 - 0.1
      );
      gainNode.gain.linearRampToValueAtTime(
        0,
        newAudioContext.currentTime + duration / 1000
      );

      setTimeout(() => {
        stopTone();
      }, duration);
    } else {
      // Reuse existing audio context
      const oscillator = audioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0.5,
        audioContext.currentTime + 0.1
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      gainNodeRef.current = gainNode;
      oscillatorRef.current = oscillator;

      // Schedule the tone to stop
      gainNode.gain.setValueAtTime(
        0.5,
        audioContext.currentTime + duration / 1000 - 0.1
      );
      gainNode.gain.linearRampToValueAtTime(
        0,
        audioContext.currentTime + duration / 1000
      );

      setTimeout(() => {
        stopTone();
      }, duration);
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

    // Cancel animations
    if (animationRef.current) {
      console.log("Canceling animation frame");
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Clear processing intervals
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }

    // Reset audio state
    setMicrophoneReady(false);
    setAudioAnalyser(null);

    // Do not reset audio context to avoid "The AudioContext was not allowed to start" errors on some browsers
    // setAudioContext(null);
  };

  // Play the demo tone sequence
  const playDemoSequence = () => {
    setStage("demo");
    setCurrentToneIndex(0);

    // Play each tone in sequence
    if (toneSequence.length > 0) {
      playTone(toneSequence[0], 2000);
    }

    // After demo finishes, prompt user to record
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

      // Start drawing waveform
      drawWaveform();

      console.log("Microphone initialized successfully");
      return true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setMicrophoneAccess(false);
      setStage("failure");
      return false;
    }
  };

  // Process audio data and send to server
  const processAudioData = async () => {
    if (
      !audioAnalyser ||
      !audioDataRef.current ||
      !challengeId ||
      !microphoneReady
    ) {
      return;
    }

    try {
      // Rate limit processing to avoid overwhelming the server
      const now = Date.now();
      if (now - lastProcessedAt < 80) {
        // Max ~12 requests per second
        return;
      }
      setLastProcessedAt(now);

      // Get audio data from analyzer
      audioAnalyser.getFloatTimeDomainData(audioDataRef.current);

      // Send to server for processing
      const result = await processAudio(challengeId, audioDataRef.current);

      setUserFrequency(result.frequency);
      setUserAmplitude(result.amplitude);
      setConfidenceScore(result.confidenceScore);

      // Store every userFrequency during recording
      if (isRecordingRef.current && result.frequency > 0) {
        recordedFrequenciesRef.current.push(result.frequency);
        // Optionally log
        // console.log("Stored userFrequency:", result.frequency);
      }
    } catch (error) {
      console.error("Error processing audio data:", error);
      // Don't fail completely on errors, just log them
    }
  };

  // Draw a waveform visualization
  const drawWaveform = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up canvas for drawing
    ctx.fillStyle = "#1e1e2f"; // Dark blue background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const draw = () => {
      // Clear the canvas
      ctx.fillStyle = "#1e1e2f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw time grid
      ctx.strokeStyle = "#333344";
      ctx.lineWidth = 1;

      const gridSize = 30;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw waveform
      ctx.strokeStyle = isRecording ? "#4CAF50" : "#2196F3";
      ctx.lineWidth = 3;
      ctx.beginPath();

      // Always draw waveform data when microphone is ready
      if (audioAnalyser && audioDataRef.current && microphoneReady) {
        // Get the latest audio data
        audioAnalyser.getFloatTimeDomainData(audioDataRef.current);

        const bufferLength = audioDataRef.current.length;
        const centerY = canvas.height / 2;
        const sliceWidth = canvas.width / bufferLength;

        // Enhance the waveform visualization
        const amplificationFactor = isRecording ? 3.0 : 2.0; // Amplify the waveform

        ctx.moveTo(0, centerY);

        for (let i = 0; i < bufferLength; i += 4) {
          // Skip some samples for performance
          const x = i * sliceWidth;
          const v = audioDataRef.current[i] * amplificationFactor;
          const y = centerY + (v * canvas.height) / 2; // Scale to fit canvas

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      } else {
        // Draw simulated waveform when not recording
        const centerY = canvas.height / 2;
        const amplitude = 20;
        const step = 5;
        const time = Date.now() / 1000;

        ctx.moveTo(0, centerY);

        for (let x = 0; x < canvas.width; x += step) {
          // Create a simpler waveform
          const y = centerY + Math.sin(x * 0.01 + time * 2) * amplitude;

          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Draw frequency indicator on the waveform during recording
      if (isRecording && userFrequency > 0) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px monospace";
        ctx.fillText(`Detected: ${Math.round(userFrequency)} Hz`, 10, 25);
      }

      // Continue animation
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  // Start recording
  const startRecording = () => {
    setIsRecording(true);
    recordedFrequenciesRef.current = []; // Reset before each recording
    processingIntervalRef.current = setInterval(processAudioData, 100);
    setTimeout(() => {
      setIsRecording(false);
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }
      analyzeRecording();
    }, 2000);
  };

  // Analyze the recording
  const analyzeRecording = async () => {
    setStage("analyzing");
    try {
      console.log("All recorded frequencies:", recordedFrequenciesRef.current);
      const result = await verifyAudioResponse(challengeId, recordedFrequenciesRef.current);
      if (result.success) {
        setStage("success");
        onSuccess();
      } else {
        setStage("failure");
      }
    } catch (error) {
      setStage("failure");
    }
  };

  // Try again
  const handleRetry = () => {
    // Clean up
    cleanupAudio();

    // Reset state
    setStage("initial");
    setCurrentToneIndex(0);
    setUserFrequency(0);
    setUserAmplitude(0);
    setConfidenceScore(0);
    setIsRecording(false);

    // Initialize a new challenge
    initChallenge();
  };

  // Start button handler
  const handleStart = async () => {
    if (await initMicrophone()) {
      playDemoSequence();
    }
  };

  // Record button handler
  const handleRecord = () => {
    startRecording();
  };

  // Toggle debug display
  const toggleDebug = () => {
    setShowDebug(!showDebug);
  };

  // Determine if we should show debug info based on microphone state
  const shouldShowDebug = showDebug && (stage !== "initial" || microphoneReady);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  return (
    <div className="w-full">
      <div className="mb-4 overflow-hidden rounded-lg aspect-[2/1] bg-gray-900 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          width={600}
          height={300}
        />

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs animate-pulse">
            Recording...
          </div>
        )}

        {/* Frequency display - always show when debug is enabled */}
        {shouldShowDebug && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded text-sm font-mono">
            {toneSequence.length > 0 && <div>Target: {toneSequence[0]} Hz</div>}
            {/* Always show user frequency when microphone is ready */}
            {microphoneReady && (
              <>
                <div>User: {Math.round(userFrequency)} Hz</div>
                <div>Amplitude: {Math.round(userAmplitude)}</div>
                {/* Show confidence when recording or analyzing */}
                {(stage === "recording" || stage === "analyzing") && (
                  <div>Confidence: {(confidenceScore * 100).toFixed(1)}%</div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Instructions and controls */}
      <div className="space-y-4">
        {stage === "initial" && (
          <div>
            <h3 className="text-lg font-medium mb-2 text-center">
              Audio Tone Mimicry
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
              Listen to a tone and then mimic it with your voice.
            </p>
            <button
              onClick={handleStart}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-md transition-colors"
            >
              Start
            </button>
          </div>
        )}

        {stage === "demo" && (
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-md">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-semibold">Listen carefully:</span> You will
              need to mimic this tone with your voice.
            </p>
          </div>
        )}

        {stage === "recording" && (
          <div>
            <div className="bg-green-50 dark:bg-green-900 p-4 rounded-md mb-4">
              <p className="text-sm text-green-700 dark:text-green-300">
                <span className="font-semibold">Your turn:</span> Now try to
                mimic the tone you just heard with your voice.
              </p>
            </div>
            <button
              onClick={handleRecord}
              className={`w-full ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-primary-500 hover:bg-primary-600"
              } text-white py-2 px-4 rounded-md transition-colors`}
              disabled={isRecording}
            >
              {isRecording ? "Recording..." : "Start Recording"}
            </button>
          </div>
        )}

        {stage === "analyzing" && (
          <div className="text-center py-4">
            <div className="w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">
              Analyzing your tone...
            </p>
          </div>
        )}

        {stage === "success" && (
          <div className="bg-green-50 dark:bg-green-900 p-4 rounded-md text-center">
            <div className="text-green-500 mb-2">
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

        {stage === "failure" && (
          <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md text-center">
            <div className="text-red-500 mb-2">
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
            <h3 className="text-lg font-medium mb-2 text-red-700 dark:text-red-300">
              Verification Failed
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              {microphoneAccess
                ? "We couldn't match your tone with the expected frequency."
                : "We couldn't access your microphone."}
            </p>
            <button
              onClick={handleRetry}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioCaptcha;
