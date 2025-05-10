import React, { useEffect, useRef } from "react";
import { defaultToneDetector } from "../../lib/toneDetector";

interface PitchVisualizerProps {
  userFrequency: number;
  targetFrequency: number;
  isRecording: boolean;
  stage: string;
}

const PitchVisualizer: React.FC<PitchVisualizerProps> = ({
  userFrequency,
  targetFrequency,
  isRecording,
  stage,
}) => {
  // Scale for visualization - how much to move per Hz difference
  // Set a reference point for visualization
  const containerRef = useRef<HTMLDivElement>(null);

  // For a singing-app like visualization, we want to show active pitch within a range
  // When no frequency detected, just show the prompt
  if (userFrequency <= 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900">
        {stage === "recording" ? (
          <div className="text-gray-300 text-center">
            <p className="text-xl mb-2">Make a sound</p>
            <p className="text-sm">Sing or hum to match the target frequency</p>
          </div>
        ) : stage === "demo" ? (
          <div className="text-white text-center">
            <p className="text-xl">Listen carefully</p>
            <p className="text-sm">Target: {targetFrequency} Hz</p>
          </div>
        ) : stage === "bot-detected" ? (
          <div className="text-red-400 text-center">
            <p className="text-xl">Bot Detected</p>
            <p className="text-sm">Synthetic audio is not allowed</p>
          </div>
        ) : (
          <div className="text-gray-400 text-center">
            <p className="text-xl">Ready to start</p>
            <p className="text-sm">Click Start to begin</p>
          </div>
        )}
      </div>
    );
  }

  // Additional special case for bot detection when frequency > 0
  if (stage === "bot-detected") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900">
        <div className="text-red-400 text-center">
          <p className="text-xl">Bot Detected</p>
          <p className="text-sm">Synthetic audio is not allowed</p>
        </div>
      </div>
    );
  }

  // Calculate match and position for visualization
  const isMatch = defaultToneDetector.isFrequencyMatch(
    userFrequency,
    targetFrequency
  );

  // Calculate position information for the visualization
  const { noteInfo, percentFromTarget, matchConfidence } =
    calculateNotePosition(userFrequency, targetFrequency);

  return (
    <div className="flex flex-col items-center justify-between h-full py-4 bg-gray-900">
      {/* Top info area */}
      <div className="text-center mb-2 px-4">
        <div className="text-lg mb-1">
          <span className="text-white">Current: </span>
          <span className="font-mono text-white">
            {Math.round(userFrequency)} Hz
          </span>
        </div>
        <div className="text-sm">
          <span className="text-gray-300">Target: </span>
          <span className="font-mono text-gray-300">{targetFrequency} Hz</span>
          <span className="text-gray-400 text-xs ml-1">(or octaves)</span>
        </div>
      </div>

      {/* Main pitch visualization area */}
      <div
        className="flex-grow w-full max-w-sm relative mx-auto mb-4"
        ref={containerRef}
        style={{ height: "60%" }}
      >
        {/* Vertical scale background */}
        <div className="absolute inset-0 flex flex-col justify-between px-8">
          {/* Scale markers */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-px bg-gray-700" />
          ))}
        </div>

        {/* Target zone indicator */}
        <div
          className="absolute left-0 right-0 h-16 bg-green-600/10 border-y-2 border-green-600/30 backdrop-blur-sm"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 text-xs">
            Target
          </div>
        </div>

        {/* Moving pitch indicator */}
        <div
          className={`absolute left-0 right-0 flex items-center justify-end transition-all duration-150 px-4 ${
            isMatch ? "opacity-100" : "opacity-80"
          }`}
          style={{
            top: `${Math.max(0, Math.min(100, 50 + percentFromTarget * 40))}%`,
            transform: "translateY(-50%)",
          }}
        >
          {/* Pitch ball with animated glow effect */}
          <div
            className={`relative flex items-center ${
              isMatch ? "animate-pulse" : ""
            }`}
          >
            <div
              className="absolute inset-0 rounded-full blur-md"
              style={{
                backgroundColor: getPitchColor(percentFromTarget, isMatch),
                opacity: matchConfidence,
              }}
            />
            <div
              className="h-12 w-12 rounded-full shadow-lg z-10 flex items-center justify-center"
              style={{
                backgroundColor: getPitchColor(percentFromTarget, isMatch),
              }}
            >
              {isMatch && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="ml-2 bg-black/50 px-3 py-1 rounded-md">
              <span className="text-white text-sm font-medium">{noteInfo}</span>
            </div>
          </div>
        </div>

        {/* Match accuracy indicator */}
        {isMatch && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
            <div className="bg-green-500/20 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="text-green-300 text-xs">
                Match confidence: {Math.round(matchConfidence * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to calculate position information for visualization
function calculateNotePosition(
  recorded: number,
  expected: number
): {
  noteInfo: string;
  percentFromTarget: number;
  matchConfidence: number;
} {
  // Find the closest target frequency (direct, octave up, or octave down)
  const directDiff = Math.abs(recorded - expected);
  const octaveUpDiff = Math.abs(recorded - expected * 2);
  const octaveDownDiff = Math.abs(recorded - expected / 2);

  let closestTarget = expected;
  let noteDesc = "direct";

  if (octaveUpDiff < directDiff && octaveUpDiff < octaveDownDiff) {
    closestTarget = expected * 2;
    noteDesc = "octave up";
  } else if (octaveDownDiff < directDiff && octaveDownDiff < octaveUpDiff) {
    closestTarget = expected / 2;
    noteDesc = "octave down";
  }

  // Calculate percentage from target for visualization
  // Normalize to range between -1 and 1, where 0 is perfect match
  const diffRatio = (recorded - closestTarget) / closestTarget;
  const percentFromTarget = Math.max(-1, Math.min(1, diffRatio));

  // Get match confidence from the tone detector
  const matchConfidence = defaultToneDetector.calculateMatchConfidence(
    recorded,
    expected
  );

  // Prepare note info text - remove any directional hints and just show the match status
  const matchText = defaultToneDetector.isFrequencyMatch(recorded, expected)
    ? "✓ Match!"
    : `${Math.abs(Math.round(recorded - closestTarget))} Hz`;

  return {
    noteInfo: matchText,
    percentFromTarget: percentFromTarget,
    matchConfidence: matchConfidence,
  };
}

// Helper function to get color based on how close to target frequency
function getPitchColor(percentFromTarget: number, isMatch: boolean): string {
  if (isMatch) return "#10b981"; // Green for match

  // Create a gradient from blue (cold, too low) to orange/red (hot, too high)
  if (percentFromTarget < 0) {
    // Too low - blue to cyan
    const intensity = Math.min(1, Math.abs(percentFromTarget) * 2);
    return `rgb(59, ${Math.round(130 + intensity * 125)}, ${Math.round(
      170 + intensity * 85
    )})`;
  } else {
    // Too high - orange to red
    const intensity = Math.min(1, percentFromTarget * 2);
    return `rgb(${Math.round(220 + intensity * 35)}, ${Math.round(
      120 - intensity * 70
    )}, 50)`;
  }
}

export default PitchVisualizer;
