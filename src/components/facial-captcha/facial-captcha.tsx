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
  const [botDetected, setBotDetected] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  const [stage, setStage] = useState<
    "loading" | "expression" | "success" | "bot_detected" | "timeout"
  >("loading");
  const [currentTargetEmoji, setCurrentTargetEmoji] = useState(""); // emoji to show the user
  const [currentExpressionIndex, setCurrentExpressionIndex] = useState(0); // which expression in the sequence we're on
  const [holdProgress, setHoldProgress] = useState(0); // progress bar for holding the expression
  const [webcamVerified, setWebcamVerified] = useState(false);
  const frameHistoryRef = useRef<FrameData[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const suspiciousFrameCountRef = useRef<number>(0);

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
    if (label.includes("virtual") || label.includes("screen") || label.includes("obs")) {
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

    const previousFrame = frameHistoryRef.current[frameHistoryRef.current.length - 1];
    
    // Check frame timing
    const timeDiff = currentFrame.timestamp - previousFrame.timestamp;
    if (timeDiff < 30 || timeDiff > 200) { // Expect frames between 30-200ms apart
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
      if (variationRatio < 0.01) { // Less than 1% variation
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
      const canvas = document.createElement('canvas');
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
          facingMode: "user"
        } 
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
          nextExpr = expressions[Math.floor(Math.random() * expressions.length)];
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const currentFrame: FrameData = {
      timestamp: Date.now(),
      pixelData: ctx.getImageData(0, 0, canvas.width, canvas.height),
      faceDetected: false
    };

    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    currentFrame.faceDetected = !!detections;

    // Analyze frame variations
    if (!analyzeFrameVariations(currentFrame)) {
      if (suspiciousFrameCountRef.current > 10) {
        setBotDetected(true);
        setStage("bot_detected");
        cleanup();
        onSuccess(true);
        return;
      }
    } else {
      suspiciousFrameCountRef.current = Math.max(0, suspiciousFrameCountRef.current - 1);
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

      {stage === "expression" && !webcamVerified && (
        <div role="alert" aria-live="assertive">
          <p style={{ color: "red" }}>Verifying webcam...</p>
        </div>
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
