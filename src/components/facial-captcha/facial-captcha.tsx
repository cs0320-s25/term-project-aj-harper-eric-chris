import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

// mapping of facial expressions to emojis
const expressionEmojis: { [key: string]: string } = {
  happy: "😊",
  angry: "😠",
  surprised: "😲",
  neutral: "😐",
  sad: "😢",
  fearful: "😨",
};

// get keys of expressionEmojis
const expressions: (keyof typeof expressionEmojis)[] = Object.keys(
  expressionEmojis
) as any;

const holdDuration = 1000; // time the user most hold the expression (1 second)

type Props = {
  onSuccess: () => void;
};

export default function ExpressionSequence({ onSuccess }: Props) {
  const [skipsLeft, setSkipsLeft] = useState(2); // number of skips the user has
  const videoRef = useRef<HTMLVideoElement>(null); // reference to the video element
  const intervalRef = useRef<number | null>(null); // reference to interval element
  const holdStartTimeRef = useRef<number | null>(null); // time the user started holding the expression
  const currentIndexRef = useRef(0); // current index in the expression sequence
  const sequenceRef = useRef<(keyof typeof expressionEmojis)[]>([]); // random expression sequence

  const [stage, setStage] = useState<"loading" | "expression" | "success">(
    "loading"
  );
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
    const expressionsDetected = detections.expressions as {
      [key: string]: number;
    };
    // sorts expressions in order of confidence scores
    const sorted = Object.entries(expressionsDetected).sort(
      (a, b) => b[1] - a[1]
    );
    // gets element with highest confidence
    const [expression, confidence] = sorted[0];

    const targetExpression = sequenceRef.current[currentIndexRef.current];
    // if top expression matches target expression and with high enough confidence
    if (expression === targetExpression && confidence > 0.5) {
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
          <p style={{ fontSize: "24px" }}>
            Match this expression:{" "}
            <span style={{ fontSize: "48px" }}>{currentTargetEmoji}</span>
          </p>
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

          <button
            onClick={() => {
              if (skipsLeft > 0) {
                // Replace the current expression with a new one
                let newExpr;
                do {
                  newExpr =
                    expressions[Math.floor(Math.random() * expressions.length)];
                } while (sequenceRef.current.includes(newExpr)); // avoid repeats

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

          <p>
            Expression {currentExpressionIndex + 1} of{" "}
            {sequenceRef.current.length}
          </p>
        </>
      )}

      {stage === "success" && <p>🎉 You completed the sequence!</p>}
    </div>
  );
}
