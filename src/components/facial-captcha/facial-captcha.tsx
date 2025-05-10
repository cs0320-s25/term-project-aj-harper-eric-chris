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
  onSuccess: (isBotDetected?: boolean) => void;
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

  const [stage, setStage] = useState<
    "loading" | "expression" | "success" | "bot_detected"
  >("loading");
  const [currentTargetEmoji, setCurrentTargetEmoji] = useState(""); // emoji to show the user
  const [currentExpressionIndex, setCurrentExpressionIndex] = useState(0); // which expression in the sequence we're on
  const [holdProgress, setHoldProgress] = useState(0); // progress bar for holding the expression

  // load the models when the component mounts
  useEffect(() => {
    loadModels();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
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

    setCurrentTargetEmoji(expressionEmojis[generatedSequence[0]]);
    setStage("expression");

    // Set up interval to process video frames every 100ms
    intervalRef.current = window.setInterval(processFrame, 100);
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
    if (
      allExpressions.every(
        (expr) => frameConfidencesRef.current[expr]?.length === 5
      )
    ) {
      const isSuspicious = allExpressions.every((expr) => {
        const confidences = frameConfidencesRef.current[expr];
        // Check if all confidences for this expression are identical
        return confidences.every(
          (score) => Math.abs(score - confidences[0]) < 0.00001
        );
      });

      if (isSuspicious) {
        setBotDetected(true);
        setStage("bot_detected");
        if (intervalRef.current) clearInterval(intervalRef.current);
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

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      {stage === "loading" && <p>Loading models...</p>}

      {stage === "expression" && (
        <>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "24px", marginBottom: "12px" }}>
              Match this expression:
            </p>
            <div>
              <div
                style={{
                  lineHeight: "1",
                  marginBottom: "12px",
                  textTransform: "capitalize",
                }}
              >
                <span style={{ fontSize: "48px" }}>{currentTargetEmoji} </span>
                <span style={{ fontSize: "24px" }}>
                  {sequenceRef.current[currentIndexRef.current]}
                </span>
              </div>
            </div>
          </div>
          <video
            ref={videoRef}
            autoPlay
            muted
            width={400}
            height={300}
            style={{ borderRadius: "8px" }}
          />
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
            aria-label="Expression hold progress"
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
          </div>
          <p
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              marginTop: "12px",
              color: "#333",
            }}
          >
            Expression{" "}
            <span style={{ color: "#4caf50" }}>
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
                    expressions[Math.floor(Math.random() * expressions.length)];
                } while (skippedExpressionRef.current.has(newExpr)); // Avoid skipped ones

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
          >
            Skip ({skipsLeft} left)
          </button>
        </>
      )}

      {stage === "success" && <p>🎉 You completed the sequence!</p>}
    </div>
  );
}
