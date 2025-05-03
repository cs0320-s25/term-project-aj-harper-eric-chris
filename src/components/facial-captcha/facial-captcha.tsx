"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import * as faceapi from "face-api.js";

// Type definitions
type FacialCaptchaProps = {
  onSuccess: () => void;
};

type ExpressionType = "neutral" | "smile" | "surprised" | "angry";

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
  surprised: {
    scale: 1.2,
    rotate: 0,
  },
  angry: {
    scale: 1.1,
    rotate: 0,
  },
};

// Update the sequence generation to ensure exactly 3 different expressions
const generateExpressionSequence = (): ExpressionType[] => {
  const expressions: ExpressionType[] = [
    "neutral",
    "smile",
    "surprised",
    "angry",
  ];
  const sequence: ExpressionType[] = [];

  // Create a copy of expressions array to shuffle
  const availableExpressions = [...expressions];

  // Shuffle the array
  for (let i = availableExpressions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableExpressions[i], availableExpressions[j]] = [
      availableExpressions[j],
      availableExpressions[i],
    ];
  }

  // Take the first 3 expressions (which will be different due to shuffling)
  sequence.push(...availableExpressions.slice(0, 3));

  console.log("Generated sequence:", sequence);
  return sequence;
};

// Emoji mapping for each expression
const expressionEmojis: Record<ExpressionType, string> = {
  neutral: "😐",
  smile: "😊",
  surprised: "😮",
  angry: "😠",
};

// Fix for the debug info state typing
interface DebugInfo {
  faceDetected?: boolean;
  expression?: string;
  [key: string]: any;
}

// Add these types after the existing type definitions
type ExpressionAnalysis = {
  expression: ExpressionType;
  confidence: number;
};

// Add this new component at the top level of the file, after the imports
const DebugPanel = ({ data }: { data: any }) => (
  <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-xs overflow-auto max-h-48">
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </div>
);

// Add this CSS animation at the top of the file after the imports:
const fadeInAnimation = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-in;
}
`;

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
  >("loading");
  const [cameraAccess, setCameraAccess] = useState(false);
  const [loadingMessage, setLoadingMessage] =
    useState<string>("Initializing...");
  const [currentUserExpression, setCurrentUserExpression] =
    useState<string>("unknown");
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [successfulMatches, setSuccessfulMatches] = useState(0);
  const [isExpressionMatched, setIsExpressionMatched] = useState(false);
  const [debugData, setDebugData] = useState<any>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentTargetEmoji, setCurrentTargetEmoji] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const expressionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sequenceRef = useRef<ExpressionType[]>([]);
  const currentIndexRef = useRef<number>(0);

  // Initialize face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingMessage("Loading face detection models...");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceExpressionNet.loadFromUri("/models");
        setIsModelLoading(false);
        setStage("initial");
      } catch (error) {
        console.error("Error loading models:", error);
        setStage("failure");
      }
    };

    loadModels();
  }, []);

  // Initialize camera
  const initializeCamera = async () => {
    try {
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

  // Start the demo sequence
  const startDemoSequence = () => {
    const sequence = generateExpressionSequence();
    console.log("Starting sequence:", sequence);
    sequenceRef.current = sequence;
    currentIndexRef.current = 0;
    setExpressionSequence(sequence);
    setCurrentExpressionIndex(0);
    setCurrentTargetEmoji(expressionEmojis[sequence[0]]); // Set initial emoji

    // Show each expression in sequence
    const showNextExpression = (index: number) => {
      if (index >= sequence.length) {
        // End of demo
        setStage("recording");
        currentIndexRef.current = 0;
        setCurrentExpressionIndex(0);
        setCurrentTargetEmoji(expressionEmojis[sequence[0]]); // Reset to first emoji
        startTracking();
        return;
      }

      currentIndexRef.current = index;
      setCurrentExpressionIndex(index);
      setCurrentTargetEmoji(expressionEmojis[sequence[index]]); // Update emoji

      // Wait and show next expression
      expressionTimerRef.current = setTimeout(() => {
        showNextExpression(index + 1);
      }, 2000);
    };

    showNextExpression(0);
  };

  // Start tracking facial expressions
  const startTracking = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Ensure we have a sequence
    if (sequenceRef.current.length === 0) {
      console.log("No sequence found, generating new sequence");
      const newSequence = generateExpressionSequence();
      sequenceRef.current = newSequence;
      currentIndexRef.current = 0;
      setExpressionSequence(newSequence);
      setCurrentExpressionIndex(0);
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const processFrame = async () => {
      if (!videoRef.current) return;

      try {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw video frame
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        console.log("🔍 Processing frame...");
        console.log("Current sequence:", sequenceRef.current);
        console.log("Current index:", currentIndexRef.current);

        // Detect faces and expressions
        const detections = await faceapi
          .detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks()
          .withFaceExpressions();

        console.log("📊 Number of faces detected:", detections.length);

        if (detections.length > 0) {
          const face = detections[0];

          // Get the expression with highest probability
          const expressions = face.expressions;
          console.log("😀 Raw expressions:", expressions);

          // Map face-api expressions to our expression types
          let expression: ExpressionType = "neutral";
          let confidence = 0;

          // Get the highest confidence expression
          const maxExpression = Object.entries(expressions).reduce((a, b) =>
            a[1] > b[1] ? a : b
          );

          // Map face-api expressions to our types
          if (expressions.happy > 0.5) {
            expression = "smile";
            confidence = expressions.happy;
          } else if (expressions.neutral > 0.5) {
            expression = "neutral";
            confidence = expressions.neutral;
          } else if (expressions.surprised > 0.5) {
            expression = "surprised";
            confidence = expressions.surprised;
          } else if (expressions.angry > 0.5) {
            expression = "angry";
            confidence = expressions.angry;
          }

          setIsExpressionMatched(confidence > 0.5);
          setCurrentUserExpression(expression);
          setDetectionConfidence(confidence);

          // Update debug data with current state
          setDebugData({
            currentExpression: expression,
            targetExpression: sequenceRef.current[currentIndexRef.current],
            confidence: confidence,
            isMatch:
              expression === sequenceRef.current[currentIndexRef.current] &&
              confidence > 0.5,
            currentIndex: currentIndexRef.current,
            totalExpressions: sequenceRef.current.length,
            sequence: sequenceRef.current,
            rawExpressions: expressions, // Add raw expressions to debug
          });

          // Draw face landmarks
          faceapi.draw.drawFaceLandmarks(canvas, face);

          // Check if expression matches target
          const targetExpression = sequenceRef.current[currentIndexRef.current];
          console.log("🎯 Target expression:", targetExpression);
          console.log("🎯 Current expression:", expression);
          console.log("🎯 Current confidence:", confidence);

          if (expression === targetExpression && confidence > 0.5) {
            console.log("==========================================");
            console.log("🎉 MATCH DETECTED! 🎉");
            console.log("Expression:", expression);
            console.log("Confidence:", confidence);
            console.log("==========================================");

            // Move to next expression in sequence
            const nextIndex = currentIndexRef.current + 1;
            if (nextIndex < sequenceRef.current.length) {
              currentIndexRef.current = nextIndex;
              setCurrentExpressionIndex(nextIndex);
              // Update the target emoji
              setCurrentTargetEmoji(
                expressionEmojis[sequenceRef.current[nextIndex]]
              );
              setIsExpressionMatched(false);
            } else {
              setShowSuccess(true);
              setIsExpressionMatched(true);
              onSuccess();
              if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
              }
            }
          } else {
            console.log(
              "❌ No match yet. Need:",
              targetExpression,
              "with confidence > 0.5"
            );
          }
        } else {
          console.log("❌ No face detected in frame");
        }
      } catch (error) {
        console.error("🚨 Error processing frame:", error);
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
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
      const sequence = generateExpressionSequence();
      console.log("Generated sequence:", sequence);
      sequenceRef.current = sequence;
      currentIndexRef.current = 0;
      setExpressionSequence(sequence);
      setCurrentExpressionIndex(0);
      startDemoSequence();
    }
  };

  // Render UI based on current stage
  if (isModelLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-center text-gray-600 dark:text-gray-300">
          Loading face detection model...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <style>{fadeInAnimation}</style>
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
            {/* Video element */}
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover ${
                stage === "recording" ? "opacity-100" : "opacity-0"
              }`}
              playsInline
              muted
            />

            {/* Canvas for drawing */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full ${
                stage === "recording" ? "opacity-100" : "opacity-100"
              }`}
              width={640}
              height={480}
            />

            {/* Green highlight overlay when expression matches */}
            {isExpressionMatched && stage === "recording" && (
              <div className="absolute inset-0 border-4 border-green-500 rounded-lg animate-pulse"></div>
            )}

            {/* Expression indicator */}
            {stage === "demo" || stage === "recording" ? (
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1.5 rounded-full text-sm">
                {stage === "demo" ? "Demo: " : "Your turn: "}
                <span className="text-2xl ml-1 transition-all duration-300">
                  {currentTargetEmoji}
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
              Captcha Verified Successfully!
            </h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              You have successfully completed the facial verification.
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
      {stage === "recording" && <DebugPanel data={debugData} />}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center animate-bounce">
            <div className="text-8xl mb-4 animate-pulse">✅</div>
            <h2 className="text-4xl font-bold mb-2 text-green-600 dark:text-green-400 animate-pulse">
              Captcha Verified Successfully!
            </h2>
            <p className="text-2xl text-gray-600 dark:text-gray-300">
              Confidence: {(debugData.confidence * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacialCaptchaComponent;
