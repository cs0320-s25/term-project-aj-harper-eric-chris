"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

// Import the mock loader
import {
  loadTensorFlow,
  initializeFaceDetector,
} from "@/lib/tensorflow-loader";

// Type definitions
type FacialCaptchaProps = {
  onSuccess: () => void;
};

type ExpressionType = "neutral" | "smile" | "surprise" | "angry";

// Animation presets for each expression
const expressionAnimations = {
  neutral: {
    scale: 1,
    rotate: 0,
  },
  smile: {
    scale: 1.1,
    rotate: 0,
  },
  surprise: {
    scale: 1.2,
    rotate: 0,
  },
  angry: {
    scale: 0.9,
    rotate: 0,
  },
};

// Generate a random sequence of facial expressions
const generateExpressionSequence = (): ExpressionType[] => {
  const allExpressions: ExpressionType[] = [
    "neutral",
    "smile",
    "surprise",
    "angry",
  ];
  const sequence: ExpressionType[] = ["neutral"]; // Always start with neutral

  // Add 2-3 random expressions
  const count = Math.floor(Math.random() * 2) + 2;

  for (let i = 0; i < count; i++) {
    const availableExpressions = allExpressions.filter(
      (expr) => expr !== sequence[sequence.length - 1]
    );
    const randomIndex = Math.floor(Math.random() * availableExpressions.length);
    sequence.push(availableExpressions[randomIndex]);
  }

  // End with neutral
  if (sequence[sequence.length - 1] !== "neutral") {
    sequence.push("neutral");
  }

  return sequence;
};

// Emoji mapping for each expression
const expressionEmojis: Record<ExpressionType, string> = {
  neutral: "😐",
  smile: "😊",
  surprise: "😲",
  angry: "😠",
};

// Fix for the debug info state typing
interface DebugInfo {
  faceDetected?: boolean;
  expression?: string;
  [key: string]: any;
}

// Create a mockup version of FacialCaptcha
const FacialCaptchaComponent = ({ onSuccess }: { onSuccess: () => void }) => {
  const [expressionSequence, setExpressionSequence] = useState<
    ExpressionType[]
  >([]);
  const [currentExpressionIndex, setCurrentExpressionIndex] = useState(-1);
  const [stage, setStage] = useState<
    | "initial"
    | "demo"
    | "recording"
    | "analyzing"
    | "success"
    | "failure"
    | "loading"
  >("loading"); // Start with loading state
  const [cameraAccess, setCameraAccess] = useState(false);
  const [loadingMessage, setLoadingMessage] =
    useState<string>("Initializing...");
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  const [currentUserExpression, setCurrentUserExpression] =
    useState<string>("unknown");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const expressionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Mock loading TensorFlow.js and dependencies
  useEffect(() => {
    const loadMockDependencies = async () => {
      // Update loading progress
      const updateProgress = (message: string) => {
        console.log(message);
        setLoadingMessage(message);
      };

      // Load mock tensorflow
      const result = await loadTensorFlow(updateProgress);

      if (result.status === "success") {
        setStage("initial");
      } else {
        setStage("failure");
      }
    };

    loadMockDependencies();

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (expressionTimerRef.current) {
        clearTimeout(expressionTimerRef.current);
      }
    };
  }, []);

  // Initialize camera (mockup)
  const initializeCamera = async () => {
    try {
      // For mockup, we can still request camera but not process it
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      streamRef.current = stream;
      setCameraAccess(true);
      return true;
    } catch (error) {
      console.error("Error accessing camera:", error);
      setCameraAccess(false);
      return false;
    }
  };

  // Draw simulated face with expression
  const drawSimulatedFace = (
    ctx: CanvasRenderingContext2D,
    expression: ExpressionType
  ) => {
    if (!ctx) return;

    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw a simple face
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const faceRadius = canvas.width * 0.3;

    // Face
    ctx.beginPath();
    ctx.arc(centerX, centerY, faceRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffdb99";
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    const eyeY = centerY - faceRadius * 0.15;
    const eyeRadiusX = faceRadius * 0.15;
    const eyeRadiusY = faceRadius * (expression === "surprise" ? 0.2 : 0.1);
    const leftEyeX = centerX - faceRadius * 0.35;
    const rightEyeX = centerX + faceRadius * 0.35;

    // Draw eyes based on expression
    ctx.beginPath();
    ctx.ellipse(leftEyeX, eyeY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
    ctx.ellipse(rightEyeX, eyeY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);

    if (expression === "angry") {
      // Angry eyebrows
      ctx.moveTo(leftEyeX - eyeRadiusX, eyeY - eyeRadiusY - 10);
      ctx.lineTo(leftEyeX + eyeRadiusX, eyeY - eyeRadiusY);
      ctx.moveTo(rightEyeX - eyeRadiusX, eyeY - eyeRadiusY);
      ctx.lineTo(rightEyeX + eyeRadiusX, eyeY - eyeRadiusY - 10);
    } else if (expression === "surprise") {
      // Surprised eyebrows
      ctx.moveTo(leftEyeX - eyeRadiusX, eyeY - eyeRadiusY - 15);
      ctx.lineTo(leftEyeX + eyeRadiusX, eyeY - eyeRadiusY - 15);
      ctx.moveTo(rightEyeX - eyeRadiusX, eyeY - eyeRadiusY - 15);
      ctx.lineTo(rightEyeX + eyeRadiusX, eyeY - eyeRadiusY - 15);
    } else {
      // Normal eyebrows
      ctx.moveTo(leftEyeX - eyeRadiusX, eyeY - eyeRadiusY - 10);
      ctx.lineTo(leftEyeX + eyeRadiusX, eyeY - eyeRadiusY - 10);
      ctx.moveTo(rightEyeX - eyeRadiusX, eyeY - eyeRadiusY - 10);
      ctx.lineTo(rightEyeX + eyeRadiusX, eyeY - eyeRadiusY - 10);
    }

    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.stroke();

    // Mouth
    const mouthY = centerY + faceRadius * 0.25;
    const mouthWidth = faceRadius * 0.6;
    const mouthHeight = faceRadius * 0.3;

    ctx.beginPath();
    if (expression === "smile") {
      // Smile
      ctx.arc(centerX, mouthY, mouthWidth / 2, 0, Math.PI);
    } else if (expression === "surprise") {
      // Surprised mouth
      ctx.ellipse(
        centerX,
        mouthY,
        mouthWidth / 3,
        mouthHeight / 1.5,
        0,
        0,
        Math.PI * 2
      );
    } else if (expression === "angry") {
      // Angry mouth
      ctx.moveTo(centerX - mouthWidth / 2, mouthY);
      ctx.lineTo(centerX + mouthWidth / 2, mouthY);
    } else {
      // Neutral mouth
      ctx.moveTo(centerX - mouthWidth / 2, mouthY);
      ctx.lineTo(centerX + mouthWidth / 2, mouthY);
    }

    ctx.stroke();

    // Update debug info
    setDebugInfo({
      faceDetected: true,
      expression: expression,
    });
  };

  // Start the demo sequence
  const startDemoSequence = () => {
    const sequence = generateExpressionSequence();
    setExpressionSequence(sequence);
    setStage("demo");
    setCurrentExpressionIndex(0);

    // Show each expression in sequence
    const showNextExpression = (index: number) => {
      if (index >= sequence.length) {
        // End of demo
        setStage("recording");
        setCurrentExpressionIndex(0);
        return;
      }

      setCurrentExpressionIndex(index);

      // Draw the simulated face
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        drawSimulatedFace(ctx, sequence[index]);
      }

      // Wait and show next expression
      expressionTimerRef.current = setTimeout(() => {
        showNextExpression(index + 1);
      }, 2000);
    };

    showNextExpression(0);
  };

  // Simulate facial tracking
  const startTracking = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // For mockup, we'll simulate recognition after a delay
    let frameCount = 0;
    let currentFrame = 0;
    const targetFrames = 50; // approximately 2 seconds at 24fps

    const simulateTracking = () => {
      frameCount++;
      if (frameCount % 3 === 0) {
        // Skip frames to simulate processing time
        if (currentFrame < targetFrames) {
          // Draw the current expression
          const currentExpression = expressionSequence[currentExpressionIndex];
          drawSimulatedFace(ctx, currentExpression);

          // Update the user's current expression periodically to show "progress"
          if (frameCount % 15 === 0) {
            // Randomly decide if user has matched the expression
            const matched = Math.random() > 0.3; // 70% chance of matching
            setCurrentUserExpression(matched ? currentExpression : "unknown");
          }

          currentFrame++;
        } else {
          // Move to next expression or finish
          if (currentExpressionIndex < expressionSequence.length - 1) {
            setCurrentExpressionIndex((prev) => prev + 1);
            currentFrame = 0;
          } else {
            // End of sequence, analyze results
            cancelAnimationFrame(animationFrameRef.current!);
            analyzeRecording();
            return;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(simulateTracking);
    };

    animationFrameRef.current = requestAnimationFrame(simulateTracking);
  };

  // Mock analysis that always succeeds for the mockup
  const analyzeRecording = () => {
    setStage("analyzing");

    // Simulate analysis delay
    setTimeout(() => {
      // Always succeed in the mockup
      setStage("success");
      onSuccess();
    }, 1500);
  };

  // Retry the captcha
  const handleRetry = () => {
    setStage("initial");
    setExpressionSequence([]);
    setCurrentExpressionIndex(-1);
  };

  // Start the captcha process
  const handleStart = async () => {
    const cameraInitialized = await initializeCamera();
    if (cameraInitialized) {
      startDemoSequence();
    }
  };

  // Render UI based on current stage
  return (
    <div className="w-full flex flex-col items-center">
      {/* Canvas and video elements */}
      <div className="relative w-full aspect-video max-h-80 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-4">
        {stage === "loading" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <div className="w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-center text-gray-600 dark:text-gray-300">
              {loadingMessage}
            </p>
          </div>
        ) : (
          <>
            {/* Hidden video element (for mockup) */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover opacity-0"
              playsInline
              muted
            />

            {/* Canvas for drawing */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              width={640}
              height={480}
            />

            {/* Expression indicator */}
            {stage === "demo" || stage === "recording" ? (
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1.5 rounded-full text-sm">
                {stage === "demo" ? "Demo: " : "Your turn: "}
                <span className="text-2xl ml-1">
                  {
                    expressionEmojis[
                      expressionSequence[currentExpressionIndex] || "neutral"
                    ]
                  }
                </span>
              </div>
            ) : null}

            {/* User expression display during recording */}
            {stage === "recording" && currentUserExpression !== "unknown" && (
              <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1.5 rounded-full text-sm">
                Detected:{" "}
                <span className="text-2xl ml-1">
                  {expressionEmojis[currentUserExpression as ExpressionType] ||
                    "❓"}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Instructions and controls */}
      <div className="w-full space-y-4">
        {stage === "initial" && (
          <div>
            <h3 className="text-lg font-medium mb-2 text-center">
              Facial Expression CAPTCHA
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
              Mimic a sequence of facial expressions to verify you are human.
            </p>
            <button
              onClick={handleStart}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-md transition-colors"
            >
              Start Facial Verification
            </button>
          </div>
        )}

        {stage === "demo" && (
          <div className="bg-blue-50 dark:bg-blue-900 rounded-md p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-semibold">Demonstration:</span> Watch the
              sequence of expressions you'll need to mimic.
            </p>
          </div>
        )}

        {stage === "recording" && (
          <div className="bg-green-50 dark:bg-green-900 rounded-md p-4">
            <p className="text-sm text-green-700 dark:text-green-300">
              <span className="font-semibold">Your turn:</span> Now mimic each
              expression as shown. Stay in position until the next expression
              appears.
            </p>
          </div>
        )}

        {stage === "analyzing" && (
          <div className="text-center py-4">
            <div className="w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">
              Analyzing your expressions...
            </p>
          </div>
        )}

        {stage === "success" && (
          <div className="bg-green-50 dark:bg-green-900 rounded-md p-4 text-center">
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
              You have successfully completed the facial expression challenge.
            </p>
          </div>
        )}

        {stage === "failure" && (
          <div className="bg-red-50 dark:bg-red-900 rounded-md p-4 text-center">
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
              {cameraAccess
                ? "We couldn't match your expressions with the expected sequence."
                : "We couldn't access your camera."}
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

export default FacialCaptchaComponent;
