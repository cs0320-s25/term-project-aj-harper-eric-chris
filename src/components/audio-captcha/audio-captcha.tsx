"use client";

import React, { useState, useEffect, useRef } from "react";

interface AudioCaptchaProps {
  onSuccess: () => void;
}

const AudioCaptcha: React.FC<AudioCaptchaProps> = ({ onSuccess }) => {
  // State for tone sequence
  const [toneSequence, setToneSequence] = useState<number[]>([]);
  const [currentToneIndex, setCurrentToneIndex] = useState(0);

  // State for microphone and audio context
  const [microphoneAccess, setMicrophoneAccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // State for challenge progress
  const [stage, setStage] = useState<
    "initial" | "demo" | "recording" | "analyzing" | "success" | "failure"
  >("initial");

  // Debug information
  const [showDebug, setShowDebug] = useState(true);
  const [userFrequency, setUserFrequency] = useState<number>(0);
  const [userAmplitude, setUserAmplitude] = useState<number>(0);

  // Refs
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Generate a simpler tone sequence (shorter and easier to mimic)
  const generateToneSequence = () => {
    // Use lower frequencies that are easier for humans to replicate
    const baseFrequencies = [200, 300, 400];

    // For simplicity, just use a single tone
    const randomIndex = Math.floor(Math.random() * baseFrequencies.length);
    const frequency = baseFrequencies[randomIndex];

    console.log(`Generated tone with frequency: ${frequency}Hz`);

    // Return a single-tone sequence
    return [frequency];
  };

  // Initialize on mount
  useEffect(() => {
    const sequence = generateToneSequence();
    setToneSequence(sequence);

    // Clean up on unmount
    return () => {
      stopTone();
      cleanupAudio();
    };
  }, []);

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

    if (streamRef.current) {
      console.log("Stopping audio tracks");
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (animationRef.current) {
      console.log("Canceling animation frame");
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
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
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // Store the stream for later cleanup
      streamRef.current = stream;
      setMicrophoneAccess(true);

      // For frontend mockup, draw a waveform animation
      drawWaveform();

      return true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setMicrophoneAccess(false);
      setStage("failure");
      return false;
    }
  };

  // Draw a simulated waveform animation
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

      // Generate simulated waveform
      const centerY = canvas.height / 2;
      const amplitude = isRecording ? 40 + Math.random() * 30 : 20;
      const step = 5;
      const time = Date.now() / 1000;

      ctx.moveTo(0, centerY);

      for (let x = 0; x < canvas.width; x += step) {
        // Create a more complex waveform with multiple frequencies
        const y =
          centerY +
          Math.sin(x * 0.02 + time * 5) * amplitude * 0.5 +
          Math.sin(x * 0.01 + time * 3) * amplitude * 0.3 +
          Math.sin(x * 0.005 + time) * amplitude * 0.2;

        ctx.lineTo(x, y);
      }

      ctx.stroke();

      // Draw user frequency simulation
      if (isRecording) {
        // Simulate user frequency changing gradually
        const targetFreq = toneSequence[0];
        const currentFreq = userFrequency || 100;

        // Gradually converge to the target frequency
        const newFreq =
          currentFreq * 0.95 + targetFreq * 0.05 * (0.8 + Math.random() * 0.4);
        setUserFrequency(newFreq);

        // Also simulate amplitude
        setUserAmplitude(30 + Math.random() * 20);

        // Draw frequency indicator
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px monospace";
        ctx.fillText(`Frequency: ${Math.round(newFreq)} Hz`, 10, 25);
      }

      // Continue animation
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  // Start recording
  const startRecording = () => {
    setIsRecording(true);

    // Simulate recording for 3 seconds
    setTimeout(() => {
      setIsRecording(false);
      analyzeRecording();
    }, 3000);
  };

  // Analyze the recording (mocked)
  const analyzeRecording = () => {
    setStage("analyzing");

    // Simulate analysis delay
    setTimeout(() => {
      // For frontend mockup, always succeed
      setStage("success");
      onSuccess();
    }, 1500);
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
    setIsRecording(false);
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

        {/* Frequency display */}
        {showDebug && stage !== "initial" && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded text-sm font-mono">
            <div>Target: {toneSequence[0]} Hz</div>
            {(stage === "recording" || stage === "analyzing") && (
              <>
                <div>User: {Math.round(userFrequency)} Hz</div>
                <div>Amplitude: {Math.round(userAmplitude)}</div>
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
