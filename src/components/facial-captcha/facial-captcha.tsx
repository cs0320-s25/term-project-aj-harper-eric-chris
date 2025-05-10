import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import {
  generateFacialChallenge,
  verifyExpression as verifyFacialExpression,
  skipExpression,
} from "../../lib/facialCaptchaApi";

// mapping of facial expressions to emojis
const expressionEmojis: { [key: string]: string } = {
  happy: "😊",
  angry: "😠",
  surprised: "😲",
  neutral: "😐",
  sad: "😢",
};

const holdDuration = 500; // time the user most hold the expression (.5 second)

type Props = {
  onSuccess: () => void;
};

export default function ExpressionSequence({ onSuccess }: Props) {
  const [skipsLeft, setSkipsLeft] = useState(2); // number of skips the user has
  const videoRef = useRef<HTMLVideoElement>(null); // reference to the video element
  const intervalRef = useRef<number | null>(null); // reference to interval element
  const holdStartTimeRef = useRef<number | null>(null); // time the user started holding the expression

  const [challengeId, setChallengeId] = useState<string>("");
  const [currentExpression, setCurrentExpression] = useState<string>("");
  const [expressionsTotal, setExpressionsTotal] = useState<number>(0);
  const [expressionsCompleted, setExpressionsCompleted] = useState<number>(0);

  const [stage, setStage] = useState<"loading" | "expression" | "success">(
    "loading"
  );
  const [currentTargetEmoji, setCurrentTargetEmoji] = useState(""); // emoji to show the user
  const [holdProgress, setHoldProgress] = useState(0); // progress bar for holding the expression
  const [error, setError] = useState<string | null>(null);

  // load the models when the component mounts
  useEffect(() => {
    loadModels();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // load face detection and expression recognition models.
  const loadModels = async () => {
    try {
      const MODEL_URL = "/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      await startVideo();
    } catch (error) {
      console.error("Error loading models:", error);
      setError(
        "Could not load facial recognition models. Please refresh and try again."
      );
    }
  };

  // start the webcam and generate a new challenge from the backend
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Generate a new challenge from the backend
      await generateNewChallenge();

      // Set up interval to process video frames every 100ms
      intervalRef.current = window.setInterval(processFrame, 100);
    } catch (error) {
      console.error("Error starting video:", error);
      setError(
        "Could not access camera. Please ensure camera permissions are enabled and try again."
      );
    }
  };

  // get a new challenge from the backend
  const generateNewChallenge = async () => {
    try {
      const data = await generateFacialChallenge();

      if (data.success) {
        setChallengeId(data.challengeId);
        setCurrentExpression(data.currentExpression);
        setExpressionsTotal(data.totalExpressions);
        setExpressionsCompleted(0);
        setCurrentTargetEmoji(expressionEmojis[data.currentExpression]);
        setStage("expression");
      } else {
        setError("Failed to generate challenge: " + data.message);
      }
    } catch (error) {
      console.error("Error generating challenge:", error);
      setError("Failed to connect to server. Please try again later.");
    }
  };

  // process each frame to detect facial expressions
  const processFrame = async () => {
    if (!videoRef.current || !challengeId || stage !== "expression") return;

    try {
      const detections = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceExpressions();

      // if no face or expressions detected, reset progress
      if (!detections || !detections.expressions) {
        holdStartTimeRef.current = null;
        setHoldProgress(0);
        return;
      }

      // Get the confidence value for our target expression
      const expressions = detections.expressions as unknown as Record<
        string,
        number
      >;
      const confidenceValue = expressions[currentExpression] || 0;

      // Check if we have enough confidence for the target expression
      if (confidenceValue > 0) {
        if (!holdStartTimeRef.current) {
          holdStartTimeRef.current = Date.now(); // start the timer
        }

        const elapsed = Date.now() - holdStartTimeRef.current;
        setHoldProgress(Math.min((elapsed / holdDuration) * 100, 100));

        if (elapsed >= holdDuration) {
          // Expression held for required duration - verify with backend
          await verifyCurrentExpression(confidenceValue);

          // Reset timer
          holdStartTimeRef.current = null;
          setHoldProgress(0);
        }
      } else {
        // Not enough confidence, reset the timer
        holdStartTimeRef.current = null;
        setHoldProgress(0);
      }
    } catch (error) {
      console.error("Error processing frame:", error);
    }
  };

  // Verify the expression with the backend
  const verifyCurrentExpression = async (confidence: number) => {
    try {
      const data = await verifyFacialExpression(challengeId, {
        expression: currentExpression,
        confidence,
        timestamp: Date.now(),
      });

      if (data.success) {
        if (data.isComplete) {
          // Challenge completed successfully
          setStage("success");
          onSuccess();
        } else {
          // Move to next expression
          setCurrentExpression(data.nextExpression || "");
          setCurrentTargetEmoji(expressionEmojis[data.nextExpression || ""]);
          setExpressionsCompleted((prev) => prev + 1);
        }
      } else {
        // Failed to verify, continue trying
        console.log("Verification failed:", data.message);
      }
    } catch (error) {
      console.error("Error verifying expression:", error);
    }
  };

  // Skip the current expression
  const handleSkip = async () => {
    if (skipsLeft <= 0 || !challengeId) return;

    try {
      const data = await skipExpression(challengeId);

      if (data.success) {
        setCurrentExpression(data.newExpression);
        setCurrentTargetEmoji(expressionEmojis[data.newExpression]);
        holdStartTimeRef.current = null;
        setHoldProgress(0);
        setSkipsLeft((prev) => prev - 1);
      } else {
        setError("Failed to skip expression: " + data.message);
      }
    } catch (error) {
      console.error("Error skipping expression:", error);
      setError("Failed to connect to server. Please try again later.");
    }
  };

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p style={{ color: "red" }}>{error}</p>
        <button
          onClick={() => {
            setError(null);
            loadModels();
          }}
          style={{
            marginTop: "10px",
            padding: "8px 16px",
            fontSize: "16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#4caf50",
            color: "white",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

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
                <span style={{ fontSize: "24px" }}>{currentExpression}</span>
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
            <span style={{ color: "#4caf50" }}>{expressionsCompleted + 1}</span>{" "}
            of {expressionsTotal}
          </p>
          <button
            onClick={handleSkip}
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
