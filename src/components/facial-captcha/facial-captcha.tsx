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

export function ExpressionSequence({ onSuccess }: Props) {
  const [skipsLeft, setSkipsLeft] = useState(2); // number of skips the user has
  const videoRef = useRef<HTMLVideoElement>(null); // reference to the video element
  const intervalRef = useRef<number | null>(null); // reference to interval element
  const holdStartTimeRef = useRef<number | null>(null); // time the user started holding the expression
  const currentIndexRef = useRef(0); // current index in the expression sequence
  const sequenceRef = useRef<(keyof typeof expressionEmojis)[]>([]); // random expression sequence
  const skippedExpressionRef = useRef<Set<keyof typeof expressionEmojis>>(
    new Set()
  ); // tracks skipped expressions

  const [stage, setStage] = useState<
    "initial" | "loading" | "expression" | "success" | "permission-error"
  >("initial");
  const [currentTargetEmoji, setCurrentTargetEmoji] = useState(""); // emoji to show the user
  const [currentExpressionIndex, setCurrentExpressionIndex] = useState(0); // which expression in the sequence we're on
  const [holdProgress, setHoldProgress] = useState(0); // progress bar for holding the expression

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
      const MODEL_URL = "/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      await startVideo();
    } catch (error) {
      console.error("Error loading models:", error);
      setStage("permission-error");
    }
  };

  // start the webcam and generate the expression sequence
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      streamRef.current = stream; // Store for cleanup

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
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

      // Set up interval to process video frames every 100ms
      intervalRef.current = window.setInterval(processFrame, 100);
    } catch (error) {
      console.error("Error accessing camera:", error);
      setStage("permission-error");
    }
  };

  // process each frame to detect facial expressions
  const processFrame = async () => {
    if (!videoRef.current) return;

    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();
    // if no face or expressions detected, reset progress
    if (!detections || !detections.expressions) {
      holdStartTimeRef.current = null;
      setHoldProgress(0);
      return;
    }
    // Fix type issue by first casting to unknown then to the desired type
    const expressionsDetected = detections.expressions as unknown as Record<
      string,
      number
    >;

    // sorts expressions in order of confidence scores
    const sorted = Object.entries(expressionsDetected).sort(
      (a, b) => b[1] - a[1]
    );
    // gets element with highest confidence
    //const [expression, confidence] = sorted[0];

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

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      {stage === "initial" && (
        <div>
          <h3 className="text-lg font-medium mb-2 text-center">
            Facial Expression Verification
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
            Complete a sequence of facial expressions to verify you're human.
          </p>
          <button
            onClick={handleStart}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-md transition-colors"
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
          <div className="relative w-full max-w-md rounded-lg overflow-hidden shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              muted
              style={{ width: "100%", height: "auto", objectFit: "cover" }}
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
