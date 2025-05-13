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

// Inline styles for consistent appearance
const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "500px",
    margin: "0 auto",
  },
  loadingContainer: {
    padding: "40px 0",
    textAlign: "center" as const,
  },
  loadingSpinner: {
    width: "48px",
    height: "48px",
    borderTop: "2px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 16px auto",
  },
  loadingText: {
    fontSize: "18px",
  },
  expressionContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    width: "100%",
  },
  expressionHeader: {
    textAlign: "center" as const,
    marginBottom: "16px",
  },
  expressionTitle: {
    fontSize: "20px",
    fontWeight: 500,
    marginBottom: "8px",
  },
  expressionBox: {
    background: "#1f2937",
    color: "white",
    padding: "12px 24px",
    borderRadius: "8px",
    display: "inline-block",
  },
  expressionContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
  },
  emoji: {
    fontSize: "40px",
  },
  expressionName: {
    fontSize: "18px",
    textTransform: "capitalize" as const,
  },
  videoContainer: {
    position: "relative" as const,
    width: "100%",
    maxWidth: "500px",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  },
  video: {
    width: "100%",
    height: "auto",
    objectFit: "cover" as const,
    borderRadius: "8px",
  },
  progressContainer: {
    marginTop: "12px",
    width: "100%",
    backgroundColor: "#e5e7eb",
    borderRadius: "9999px",
    height: "10px",
    overflow: "hidden",
  },
  progressBar: {
    backgroundColor: "#10b981",
    height: "10px",
    borderRadius: "9999px",
    transition: "width 100ms",
  },
  expressionInfo: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    marginTop: "12px",
  },
  expressionCount: {
    fontWeight: 500,
  },
  skipButton: {
    backgroundColor: "#6b7280",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  successContainer: {
    textAlign: "center" as const,
    padding: "32px 16px",
  },
  successIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  successMessage: {
    fontSize: "24px",
    fontWeight: 600,
    color: "#10b981",
    marginBottom: "8px",
  },
};

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
  const skippedExpressionRef = useRef<Set<keyof typeof expressionEmojis>>(
    new Set()
  ); // tracks skipped expressions

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
    // Fix type issue by first casting to unknown then to the desired type
    const expressionsDetected = detections.expressions as unknown as Record<
      string,
      number
    >;

    // sorts expressions in order of confidence scores
    const sorted = Object.entries(expressionsDetected).sort(
      (a, b) => b[1] - a[1]
    );

    const targetExpression = sequenceRef.current[currentIndexRef.current];
    const confidence = expressionsDetected[targetExpression];

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

  // Skip function
  const handleSkip = () => {
    if (skipsLeft > 0 && stage === "expression") {
      // Reset progress
      holdStartTimeRef.current = null;
      setHoldProgress(0);

      // Mark this expression as skipped
      const currentExpr = sequenceRef.current[currentIndexRef.current];
      skippedExpressionRef.current.add(currentExpr);

      // Reduce skips left
      setSkipsLeft((prev) => prev - 1);

      // Move to next expression
      const nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= sequenceRef.current.length) {
        // All expressions done
        setStage("success");
        onSuccess();
      } else {
        // Move to next
        currentIndexRef.current = nextIndex;
        setCurrentExpressionIndex(nextIndex);
        setCurrentTargetEmoji(expressionEmojis[sequenceRef.current[nextIndex]]);
      }
    }
  };

  // Add keyframes for spin animation
  const keyframesStyle = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  return (
    <div style={styles.container}>
      <style>{keyframesStyle}</style>

      {stage === "loading" && (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Loading facial recognition models...</p>
        </div>
      )}

      {stage === "expression" && (
        <div style={styles.expressionContainer}>
          <div style={styles.expressionHeader}>
            <p style={styles.expressionTitle}>Match this expression:</p>
            <div style={styles.expressionBox}>
              <div style={styles.expressionContent}>
                <span style={styles.emoji}>{currentTargetEmoji}</span>
                <span style={styles.expressionName}>
                  {sequenceRef.current[currentIndexRef.current]}
                </span>
              </div>
            </div>
          </div>

          {/* Video container */}
          <div style={styles.videoContainer}>
            <video ref={videoRef} autoPlay muted style={styles.video} />
          </div>

          {/* Progress bar */}
          <div style={styles.progressContainer}>
            <div
              style={{
                ...styles.progressBar,
                width: `${holdProgress}%`,
              }}
              role="progressbar"
              aria-valuenow={holdProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>

          {/* Expression info and skip button */}
          <div style={styles.expressionInfo}>
            <div style={styles.expressionCount}>
              Expression {currentExpressionIndex + 1} of{" "}
              {sequenceRef.current.length}
            </div>
            {skipsLeft > 0 && (
              <button onClick={handleSkip} style={styles.skipButton}>
                Skip ({skipsLeft} left)
              </button>
            )}
          </div>
        </div>
      )}

      {stage === "success" && (
        <div style={styles.successContainer}>
          <div style={styles.successIcon}>✅</div>
          <p style={styles.successMessage}>Verification Complete!</p>
        </div>
      )}
    </div>
  );
}
