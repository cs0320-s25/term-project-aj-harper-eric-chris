import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

// mapping of facial expressions to emojis
const expressionEmojis: { [key: string]: string } = {
  happy: "😊",
  angry: "😠",
  surprised: "😲",
  neutral: "😐",
  sad: "😢",
};

// get keys of expressionEmojis
const expressions: (keyof typeof expressionEmojis)[] = Object.keys(
  expressionEmojis
) as any;

const holdDuration = 500; // time the user most hold the expression (.5 second)

type Props = {
  onSuccess: () => void;
};

// Add new types for webcam verification
type FrameData = {
  timestamp: number;
  pixelData: ImageData;
  faceDetected: boolean;
};

export default function ExpressionSequence({ onSuccess }: Props) {
  const [skipsLeft, setSkipsLeft] = useState(2); // number of skips the user has
  const videoRef = useRef<HTMLVideoElement>(null); // reference to the video element
  const intervalRef = useRef<number | null>(null); // reference to interval element
  const holdStartTimeRef = useRef<number | null>(null); // time the user started holding the expression
  const currentIndexRef = useRef(0); // current index in the expression sequence
  const sequenceRef = useRef<(keyof typeof expressionEmojis)[]>([]); // random expression sequence
  const skippedExpressionRef = useRef<Set<keyof typeof expressionEmojis>>(
    new Set()
  ); // tracks skipped expressions

  // Change to store all expression confidences for each frame
  const frameConfidencesRef = useRef<{ [key: string]: number[] }>({});
  const startTimeRef = useRef<number>(Date.now());


  const [stage, setStage] = useState<
    "initial" | "loading" | "expression" | "success" | "permission-error"
  >("initial");
  const [currentTargetEmoji, setCurrentTargetEmoji] = useState(""); // emoji to show the user
  const [currentExpressionIndex, setCurrentExpressionIndex] = useState(0); // which expression in the sequence we're on
  const [holdProgress, setHoldProgress] = useState(0); // progress bar for holding the expression
  const [webcamVerified, setWebcamVerified] = useState(false);
  const frameHistoryRef = useRef<FrameData[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const suspiciousFrameCountRef = useRef<number>(0);

  // Cleanup function for when component unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Cleanup video stream if it exists
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Function to handle the start button click
  const handleStart = () => {
    setStage("loading");
    loadModels();
  };

  // Reference to store the media stream for cleanup
  const streamRef = useRef<MediaStream | null>(null);

  // load face detection and expression recognition models.
  const loadModels = async () => {
    try {
      // Ensure models path is correct
      const MODEL_URL =
        process.env.NODE_ENV === "production" ? "/models" : "/models";
      console.log("Loading models from:", MODEL_URL);
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      await startVideo();
    } catch (error) {
      console.error("Error loading models:", error);
      setStage("permission-error");
    }
  };

  // Add new function to verify webcam
  const verifyWebcam = async (stream: MediaStream) => {
    // Check if the stream is from a real webcam
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error("No video track found");
    }

    // Verify it's a real webcam (not a screen share or virtual camera)
    const capabilities = videoTrack.getCapabilities();
    if (!capabilities || !capabilities.width || !capabilities.height) {
      throw new Error("Invalid webcam capabilities");
    }

    // Check if it's a virtual camera (some virtual cameras have specific labels)
    const label = videoTrack.label.toLowerCase();
    if (
      label.includes("virtual") ||
      label.includes("screen") ||
      label.includes("obs")
    ) {
      throw new Error("Virtual camera detected");
    }

    return true;
  };

  // Add new function to analyze frame variations
  const analyzeFrameVariations = (currentFrame: FrameData) => {
    if (frameHistoryRef.current.length < 2) {
      frameHistoryRef.current.push(currentFrame);
      return true;
    }

    const previousFrame =
      frameHistoryRef.current[frameHistoryRef.current.length - 1];

    // Check frame timing
    const timeDiff = currentFrame.timestamp - previousFrame.timestamp;
    if (timeDiff < 30 || timeDiff > 200) {
      // Expect frames between 30-200ms apart
      suspiciousFrameCountRef.current++;
      return false;
    }

    // Check for pixel variations if face is detected
    if (currentFrame.faceDetected && previousFrame.faceDetected) {
      const currentData = currentFrame.pixelData.data;
      const previousData = previousFrame.pixelData.data;
      let diffCount = 0;
      const sampleSize = Math.min(currentData.length, previousData.length);

      // Sample pixels to check for variations
      for (let i = 0; i < sampleSize; i += 4) {
        if (Math.abs(currentData[i] - previousData[i]) > 5) {
          diffCount++;
        }
      }

      const variationRatio = diffCount / (sampleSize / 4);
      if (variationRatio < 0.01) {
        // Less than 1% variation
        suspiciousFrameCountRef.current++;
        return false;
      }
    }

    // Update frame history
    frameHistoryRef.current.push(currentFrame);
    if (frameHistoryRef.current.length > 5) {
      frameHistoryRef.current.shift();
    }

    return true;
  };

  // Add function to initialize canvas
  const initializeCanvas = () => {
    if (!canvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      canvasRef.current = canvas;

    }
  };

  // Modify startVideo function
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      // Verify webcam
      await verifyWebcam(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        initializeCanvas();
      }

      // Generate a random sequence of 3 expressions, ensuring no repeats in a row
      const generatedSequence: (keyof typeof expressionEmojis)[] = [];

      for (let i = 0; i < 3; i++) {
        let nextExpr: keyof typeof expressionEmojis;
        do {
          nextExpr =
            expressions[Math.floor(Math.random() * expressions.length)];
        } while (i > 0 && nextExpr === generatedSequence[i - 1]); // avoid same as previous

        generatedSequence.push(nextExpr);
      }

      sequenceRef.current = generatedSequence;
      setCurrentTargetEmoji(expressionEmojis[generatedSequence[0]]);
      setStage("expression");

      setWebcamVerified(true);
      startTimeRef.current = Date.now();
      frameCountRef.current = 0;
      suspiciousFrameCountRef.current = 0;

      // Set up interval to process video frames
      intervalRef.current = window.setInterval(processFrame, 150);
    } catch (error) {
      console.error("Webcam verification failed:", error);
      setStage("bot_detected");
      cleanup();
      onSuccess(true);
    }
  };

  // Modify processFrame function
  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;


    // Check for timeout
    const elapsedTime = Date.now() - startTimeRef.current;
    if (elapsedTime >= 20000) {
      setStage("timeout");
      cleanup();
      onSuccess("timeout");
      return;
    }

    // Capture current frame for analysis
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const currentFrame: FrameData = {
      timestamp: Date.now(),
      pixelData: ctx.getImageData(0, 0, canvas.width, canvas.height),
      faceDetected: false,
    };

    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    currentFrame.faceDetected = !!detections;

    // Analyze frame variations
    if (!analyzeFrameVariations(currentFrame)) {
      if (suspiciousFrameCountRef.current > 10) {
        setStage("bot_detected");
        cleanup();
        onSuccess(true);
        return;
      }
    } else {
      suspiciousFrameCountRef.current = Math.max(
        0,
        suspiciousFrameCountRef.current - 1
      );
    }

    // if no face or expressions detected, reset progress
    if (!detections || !detections.expressions) {
      holdStartTimeRef.current = null;
      setHoldProgress(0);
      return;
    }

    // map from expression to confidence score
    const expressionsDetected = detections.expressions as unknown as {
      [key: string]: number;
    };

    // Store confidences for all expressions in this frame
    Object.entries(expressionsDetected).forEach(([expression, confidence]) => {
      if (!frameConfidencesRef.current[expression]) {
        frameConfidencesRef.current[expression] = [];
      }
      frameConfidencesRef.current[expression].push(confidence);
      // Keep only last 5 frames
      if (frameConfidencesRef.current[expression].length > 5) {
        frameConfidencesRef.current[expression].shift();
      }
    });

    // Check for suspicious activity (all expressions have identical patterns across 5 frames)
    const allExpressions = Object.keys(expressionsDetected);
    // make sure each expression has 5 confidence scores stored
    if (
      allExpressions.every(
        (expr) => frameConfidencesRef.current[expr]?.length === 5
      )
    ) {
      // if every all expressions have last 5 scores too similar, mark as suspiscious.
      const isSuspicious = allExpressions.every((expr) => {
        const confidences = frameConfidencesRef.current[expr];
        // Check if all confidences for this expression are identical
        return confidences.every(
          (score) => Math.abs(score - confidences[0]) < 0.0000000001
        );
      });

      if (isSuspicious) {
        setStage("bot_detected");
        cleanup();
        onSuccess(true);
        return;
      }
    }


    const targetExpression = sequenceRef.current[currentIndexRef.current];
    const confidence = expressionsDetected[targetExpression];
    console.log(confidence);
    // if top expression matches target expression and with high enough confidence
    //if (expression === targetExpression && confidence > 0.5) {
    let target = 0.5; // default target confidence
    // set target confidence based on the target expression
    // happy and neutral are easier to hold, sad is harder, surprised/fearful/angry are hardest
    if (targetExpression == "happy" || targetExpression == "neutral") {
      target = 0.5;
    } else if (targetExpression == "sad") {
      target = 0.4;
    } else if (targetExpression == "surprised" || targetExpression == "angry") {
      target = 0.3;
    }
    if (confidence > target) {
      if (!holdStartTimeRef.current) {
        holdStartTimeRef.current = Date.now(); // start the timer
      }

      const elapsed = Date.now() - holdStartTimeRef.current;
      setHoldProgress(Math.min((elapsed / holdDuration) * 100, 100));

      if (elapsed >= holdDuration) {
        // if expression held for long enough
        console.log("✅ Expression held for 1 second!");
        // reset timer
        holdStartTimeRef.current = null;
        setHoldProgress(0);
        const nextIndex = currentIndexRef.current + 1;
        if (nextIndex >= sequenceRef.current.length) {
          // all expressions done
          setStage("success");
          onSuccess();
          return;
        } else {
          // move onto the next expression
          currentIndexRef.current = nextIndex;
          setCurrentExpressionIndex(nextIndex);
          setCurrentTargetEmoji(
            expressionEmojis[sequenceRef.current[nextIndex]]
          );
        }
      }
    } else {
      // wrong expression detected, reset the hold
      holdStartTimeRef.current = null;
      setHoldProgress(0);
    }
  };

  // Retry function for permission errors
  const handleRetry = () => {
    setStage("loading");
    // Cleanup any existing streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Reset state
    holdStartTimeRef.current = null;
    setHoldProgress(0);

    // Try loading again
    setTimeout(loadModels, 500);
  };

  // Effect to ensure video is initialized when in expression stage
  useEffect(() => {
    if (
      stage === "expression" &&
      videoRef.current &&
      streamRef.current &&
      videoRef.current.srcObject !== streamRef.current
    ) {
      console.log("Initializing video from effect hook");
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.error("Error playing video from effect:", err);
      });
    }
  }, [stage]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      {stage === "initial" && (
        <div className="text-center w-full">
          <h3 className="text-lg font-medium mb-2 text-center">
            Facial Expression Verification
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
            Complete a sequence of facial expressions to verify you're human.
          </p>
          <button
            onClick={handleStart}
            className="bg-primary-500 hover:bg-primary-600 text-white py-2 px-6 rounded-md transition-colors min-w-[160px]"
            aria-label="Start facial expression challenge"
          >
            Start
          </button>
        </div>
      )}

      {stage === "loading" && (
        <div className="py-10 text-center" aria-live="polite">

          <div
            className="w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin mx-auto mb-4"
            role="status"
            aria-label="Loading facial recognition models"
          ></div>
          <p className="text-lg">Loading facial recognition models...</p>
        </div>
      )}

      {stage === "permission-error" && (
        <div
          className="bg-red-50 dark:bg-red-900 p-4 rounded-md text-center"
          aria-live="assertive"
        >
          <div className="text-red-500 mb-2">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2 text-red-700 dark:text-red-300">
            Camera Access Required
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            Please allow camera access to use the facial expression
            verification. Your camera is used only for verification and no
            images are stored.
          </p>
          <button
            onClick={handleRetry}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-md transition-colors"
            aria-label="Try again with camera access"
          >
            Try Again
          </button>
        </div>
      )}

      {stage === "expression" && (
        <div className="flex flex-col items-center w-full">
          <div className="text-center mb-4">
            <h2
              className="text-xl font-medium mb-2"
              id="expression-instruction"
            >
              Match this expression:
            </h2>
            <div
              className="bg-gray-800 text-white py-3 px-6 rounded-lg inline-block"
              aria-live="polite"
              aria-labelledby="expression-instruction"
            >
              <div className="flex items-center justify-center space-x-3">
                <span className="text-5xl" aria-hidden="true">
                  {currentTargetEmoji}
                </span>
                <span className="text-xl capitalize">
                  {sequenceRef.current[currentIndexRef.current]}
                </span>
              </div>
            </div>
          </div>

          {/* Video container */}
          <div className="relative w-full max-w-md rounded-lg overflow-hidden shadow-lg bg-gray-100">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => console.log("Video metadata loaded")}
              onCanPlay={() => console.log("Video can now play")}
              style={{
                width: "100%",
                height: "300px",
                objectFit: "cover",
                backgroundColor: "#f0f0f0",
              }}
              className="rounded-lg"
              aria-label="Your camera view for facial expression detection"
            />

            {/* Progress bar positioned directly below the video */}
            <div
              className="mt-3 w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden"
              role="progressbar"
              aria-valuenow={holdProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Expression hold progress: ${Math.round(
                holdProgress
              )}%`}
            >
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all duration-100"
                style={{ width: `${holdProgress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-lg font-medium mb-2" aria-live="polite">
              Expression{" "}
              <span className="text-green-600 font-bold">
                {currentExpressionIndex + 1}
              </span>{" "}
              of {sequenceRef.current.length}
            </p>

            <button
              onClick={() => {
                if (skipsLeft > 0) {
                  let newExpr: keyof typeof expressionEmojis;
                  const currentExpr =
                    sequenceRef.current[currentIndexRef.current];
                  skippedExpressionRef.current.add(currentExpr); // Mark the current as skipped

                  do {
                    newExpr =
                      expressions[
                        Math.floor(Math.random() * expressions.length)
                      ];
                  } while (skippedExpressionRef.current.has(newExpr)); // Avoid skipped ones

                  sequenceRef.current[currentIndexRef.current] = newExpr;
                  setCurrentTargetEmoji(expressionEmojis[newExpr]);
                  holdStartTimeRef.current = null;
                  setHoldProgress(0);
                  setSkipsLeft((prev) => prev - 1);
                }
              }}
              disabled={skipsLeft <= 0}
              aria-label={
                skipsLeft > 0
                  ? `Skip this expression (${skipsLeft} skips left)`
                  : "No skips left"
              }
              className={`mt-2 px-4 py-2 rounded-md transition-colors ${
                skipsLeft > 0
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Skip ({skipsLeft} left)
            </button>
          </div>
        </div>
      )}

      {stage === "success" && (
        <div className="text-center py-10" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">
            🎉
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Success!</h2>
          <p className="text-lg">You completed the expression sequence!</p>
        </div>
      )}
    </div>
  );
}

// Default export for compatibility
export default ExpressionSequence;
