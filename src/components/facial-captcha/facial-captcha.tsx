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

const holdDuration = 700; // time the user most hold the expression (.7 second)

type Props = {
  onSuccess: (status: boolean | "timeout") => void;
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
  const [botDetected, setBotDetected] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  const [stage, setStage] = useState<
    "loading" | "expression" | "success" | "bot_detected" | "timeout"
  >("loading");
  const [currentTargetEmoji, setCurrentTargetEmoji] = useState(""); // emoji to show the user
  const [currentExpressionIndex, setCurrentExpressionIndex] = useState(0); // which expression in the sequence we're on
  const [holdProgress, setHoldProgress] = useState(0); // progress bar for holding the expression

  // Helper function to clean up timers and camera
  const cleanup = () => {
    console.log("Cleaning up...");
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // load the models when the component mounts
  useEffect(() => {
    loadModels();
    return cleanup;
  }, []);

  // load face detection and expression recognition models.
  const loadModels = async () => {
    const MODEL_URL = "/models";
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
    await startVideo();
  };

  // start the webcam and generate the expression sequence
  const startVideo = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    if (videoRef.current) videoRef.current.srcObject = stream;

    // Generate a random sequence of 3 expressions, ensuring no repeats in a row
    const generatedSequence: (keyof typeof expressionEmojis)[] = [];

    for (let i = 0; i < 3; i++) {
      let nextExpr: keyof typeof expressionEmojis;
      do {
        nextExpr = expressions[Math.floor(Math.random() * expressions.length)];
      } while (i > 0 && nextExpr === generatedSequence[i - 1]); // avoid same as previous

      generatedSequence.push(nextExpr);
    }

    sequenceRef.current = generatedSequence;
    startTimeRef.current = Date.now();

    setCurrentTargetEmoji(expressionEmojis[generatedSequence[0]]);
    setStage("expression");

    // Set up interval to process video frames every 50ms
    intervalRef.current = window.setInterval(processFrame, 50);
  };

  // process each frame to detect facial expressions
  const processFrame = async () => {
    if (!videoRef.current) return;

    // Check for timeout
    const elapsedTime = Date.now() - startTimeRef.current;
    if (elapsedTime >= 15000) {
      setStage("timeout");
      cleanup();
      onSuccess("timeout");
      return;
    }

    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();
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

    // TODO: MAKE SURE TIMER IS STOPPED WHENEVER VERIFIED/BOT DETECTED.
    // TODO: CAMERA SHOULD BE STOPPED WHENEVER VERIFIED/BOT DETECTED.

    // Check for suspicious activity (all expressions have identical patterns across 5 frames)
    const allExpressions = Object.keys(expressionsDetected);
    if (
      allExpressions.every(
        (expr) => frameConfidencesRef.current[expr]?.length === 5
      )
    ) {
      const isSuspicious = allExpressions.every((expr) => {
        const confidences = frameConfidencesRef.current[expr];
        // Check if all confidences for this expression are identical
        return confidences.every(
          (score) => Math.abs(score - confidences[0]) < 0.000000001
        );
      });

      if (isSuspicious) {
        setBotDetected(true);
        setStage("bot_detected");
        cleanup();
        onSuccess(true);
        return;
      }
    }

    const targetExpression = sequenceRef.current[currentIndexRef.current];
    const confidence = expressionsDetected[targetExpression];

    let target = 0.5;
    // happy and neutral are easier to hold, sad is harder, surprised/fearful/angry are hardest
    if (targetExpression == "happy" || targetExpression == "neutral") {
      target = 0.4;
    } else if (targetExpression == "sad") {
      target = 0.3;
    } else if (targetExpression == "surprised") {
      target = 0.2;
    } else if (targetExpression == "angry") {
      target = 0.1;
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
          cleanup();
          onSuccess(false);
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

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      {stage === "loading" && (
        <p role="status" aria-live="polite">
          Loading facial recognition models...
        </p>
      )}

      {stage === "expression" && (
        <>
          <div
            style={{ textAlign: "center" }}
            role="region"
            aria-label="Facial expression challenge"
          >
            <p
              style={{ fontSize: "24px", marginBottom: "12px" }}
              role="heading"
              aria-level={2}
            >
              Match this expression:
            </p>
            <div>
              <div
                style={{
                  lineHeight: "1",
                  marginBottom: "12px",
                  textTransform: "capitalize",
                }}
                role="status"
                aria-live="polite"
                aria-label={`Target expression: ${
                  sequenceRef.current[currentIndexRef.current]
                }`}
              >
                <span style={{ fontSize: "48px" }} aria-hidden="true">
                  {currentTargetEmoji}
                </span>
                <span style={{ fontSize: "24px" }} aria-hidden="true">
                  {sequenceRef.current[currentIndexRef.current]}
                </span>
              </div>
            </div>
          </div>
          <div role="region" aria-label="Webcam view">
            <video
              ref={videoRef}
              autoPlay
              muted
              width={400}
              height={300}
              style={{ borderRadius: "8px" }}
              aria-label="Webcam feed"
              role="img"
              aria-describedby="webcam-description"
            />
            <div id="webcam-description" className="sr-only">
              Your webcam feed is being used to detect your facial expressions.
              Make sure your face is clearly visible in the frame.
            </div>
          </div>
          <div
            style={{
              width: "400px",
              height: "10px",
              backgroundColor: "#eee",
              margin: "10px auto",
              borderRadius: "5px",
            }}
            role="progressbar"
            aria-valuenow={holdProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Hold progress: ${Math.round(holdProgress)}%`}
            aria-describedby="progress-description"
          >
            <div
              style={{
                width: `${holdProgress}%`,
                height: "100%",
                backgroundColor: "#4caf50",
                borderRadius: "5px",
                transition: "width 100ms linear",
              }}
            />
            <div id="progress-description" className="sr-only">
              Hold the required facial expression until the progress bar fills
              completely.
            </div>
          </div>
          <p
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              marginTop: "12px",
              color: "var(--foreground)",
            }}
            role="status"
            aria-live="polite"
            aria-label={`Expression ${currentExpressionIndex + 1} of ${
              sequenceRef.current.length
            }`}
          >
            <span aria-hidden="true">
              Expression{" "}
              <span style={{ color: "#4caf50" }}>
                {currentExpressionIndex + 1}
              </span>{" "}
              of {sequenceRef.current.length}
            </span>
          </p>
          <button
            onClick={() => {
              if (skipsLeft > 0) {
                let newExpr: keyof typeof expressionEmojis;
                const currentExpr =
                  sequenceRef.current[currentIndexRef.current];
                skippedExpressionRef.current.add(currentExpr);

                do {
                  newExpr =
                    expressions[Math.floor(Math.random() * expressions.length)];
                } while (skippedExpressionRef.current.has(newExpr));

                sequenceRef.current[currentIndexRef.current] = newExpr;
                setCurrentTargetEmoji(expressionEmojis[newExpr]);
                holdStartTimeRef.current = null;
                setHoldProgress(0);
                setSkipsLeft((prev) => prev - 1);
              }
            }}
            disabled={skipsLeft <= 0}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              fontSize: "16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: skipsLeft > 0 ? "#ccc" : "#888",
              color: skipsLeft > 0 ? "#000" : "#444",
              cursor: skipsLeft > 0 ? "pointer" : "not-allowed",
            }}
            aria-label={`Skip expression (${skipsLeft} remaining)`}
            aria-disabled={skipsLeft <= 0}
            aria-describedby="skip-description"
          >
            <span aria-hidden="true">Skip ({skipsLeft} left)</span>
            <div id="skip-description" className="sr-only">
              Skip the current expression if it's too difficult. Limited skips
              available.
            </div>
          </button>
        </>
      )}

      {stage === "success" && (
        <div role="status" aria-live="polite" aria-label="Challenge completed">
          <p aria-hidden="true">🎉 You completed the sequence!</p>
        </div>
      )}

      {stage === "timeout" && (
        <div role="status" aria-live="polite" aria-label="Challenge timed out">
          <p aria-hidden="true">⏰ Time's up! Please try again.</p>
        </div>
      )}
    </div>
  );
}
