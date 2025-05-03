import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

const expressionEmojis: { [key: string]: string } = {
  happy: "😊",
  angry: "😠",
  surprised: "😲",
  neutral: "😐",
};

const expressions: (keyof typeof expressionEmojis)[] = Object.keys(
  expressionEmojis
) as any;

const holdDuration = 1000; // 1 seconds

type Props = {
  onSuccess: () => void;
};

export default function ExpressionSequence({ onSuccess }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<number | null>(null);
  const holdStartTimeRef = useRef<number | null>(null);
  const currentIndexRef = useRef(0);
  const sequenceRef = useRef<(keyof typeof expressionEmojis)[]>([]);

  const [stage, setStage] = useState<"loading" | "expression" | "success">(
    "loading"
  );
  const [currentTargetEmoji, setCurrentTargetEmoji] = useState("");
  const [currentExpressionIndex, setCurrentExpressionIndex] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);

  useEffect(() => {
    loadModels();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const loadModels = async () => {
    const MODEL_URL = "/models";
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
    await startVideo();
  };

  const startVideo = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    if (videoRef.current) videoRef.current.srcObject = stream;

    const generatedSequence = Array.from(
      { length: 3 },
      () => expressions[Math.floor(Math.random() * expressions.length)]
    );
    sequenceRef.current = generatedSequence;

    setCurrentTargetEmoji(expressionEmojis[generatedSequence[0]]);
    setStage("expression");

    intervalRef.current = window.setInterval(processFrame, 100);
  };

  const processFrame = async () => {
    if (!videoRef.current) return;

    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    if (!detections || !detections.expressions) {
      holdStartTimeRef.current = null;
      setHoldProgress(0);
      return;
    }

    const expressionsDetected = detections.expressions as {
      [key: string]: number;
    };
    const sorted = Object.entries(expressionsDetected).sort(
      (a, b) => b[1] - a[1]
    );
    const [expression, confidence] = sorted[0];

    const targetExpression = sequenceRef.current[currentIndexRef.current];

    if (expression === targetExpression && confidence > 0.5) {
      if (!holdStartTimeRef.current) {
        holdStartTimeRef.current = Date.now();
      }

      const elapsed = Date.now() - holdStartTimeRef.current;
      setHoldProgress(Math.min((elapsed / holdDuration) * 100, 100));

      if (elapsed >= holdDuration) {
        console.log("✅ Expression held for 2 seconds!");
        holdStartTimeRef.current = null;
        setHoldProgress(0);

        const nextIndex = currentIndexRef.current + 1;
        if (nextIndex >= sequenceRef.current.length) {
          setStage("success");
          onSuccess();
          return;
        } else {
          currentIndexRef.current = nextIndex;
          setCurrentExpressionIndex(nextIndex);
          setCurrentTargetEmoji(
            expressionEmojis[sequenceRef.current[nextIndex]]
          );
        }
      }
    } else {
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
