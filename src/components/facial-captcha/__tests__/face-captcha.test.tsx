import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ExpressionSequence } from "../facial-captcha";
import {
  setMockExpression,
  setMockConstantValues,
  clearMockConstantValues,
} from "../../../lib/mockFaceApi";

// to run this test, run the following command:
// npm test src/components/facial-captcha/__tests__/face-captcha.test.tsx

// Enable fake timers
jest.useFakeTimers();

// Mock the face-api.js module
jest.mock("face-api.js", () => require("../../../lib/mockFaceApi").default);

// Mock the video element
const mockVideoTrack: MediaStreamTrack = {
  stop: jest.fn(),
  kind: "video",
  enabled: true,
  muted: false,
  readyState: "live",
  contentHint: "",
  id: "mock-video-track",
  label: "Mock Webcam",
  onended: null,
  onmute: null,
  onunmute: null,
  clone: jest.fn(),
  applyConstraints: jest.fn(),
  getCapabilities: jest.fn().mockReturnValue({
    width: { min: 640, max: 1920 },
    height: { min: 480, max: 1080 },
    aspectRatio: { min: 1.3, max: 1.8 },
    frameRate: { min: 15, max: 60 },
    facingMode: ["user", "environment"],
  }),
  getConstraints: jest.fn(),
  getSettings: jest.fn().mockReturnValue({
    width: 640,
    height: 480,
    aspectRatio: 1.33,
    frameRate: 30,
    facingMode: "user",
  }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
};

// Create a proper MediaStream mock
class MockMediaStream {
  private tracks: MediaStreamTrack[];

  constructor(tracks: MediaStreamTrack[]) {
    this.tracks = tracks;
  }

  getTracks() {
    return this.tracks;
  }

  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === "video");
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === "audio");
  }
}

// Mock getUserMedia
Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: jest
      .fn()
      .mockResolvedValue(new MockMediaStream([mockVideoTrack])),
  },
});

// Mock the video element
Object.defineProperty(HTMLVideoElement.prototype, "srcObject", {
  set: jest.fn((stream) => {}),
  get: jest.fn(() => {
    return new MockMediaStream([mockVideoTrack]);
  }),
});

// Mock the canvas element
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: jest.fn().mockReturnValue({
    drawImage: jest.fn((video) => {}),
    getImageData: jest.fn().mockReturnValue({
      data: new Uint8ClampedArray(640 * 480 * 4),
    }),
  }),
});

describe("ExpressionSequence", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Clear any existing mock expression
    window.__MOCK_EXPRESSION = undefined;
  });

  it("shows loading state initially", () => {
    render(<ExpressionSequence onSuccess={() => {}} />);
    expect(
      screen.getByText("Loading facial recognition models...")
    ).toBeInTheDocument();
  });

  it("shows start button after loading", async () => {
    render(<ExpressionSequence onSuccess={() => {}} />);

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });
  });

  it("completes challenge when correct expressions are shown", async () => {
    const mockOnSuccess = jest.fn();
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    await act(async () => {
      screen.getByRole("button", { name: /start facial challenge/i }).click();
    });

    // Complete all three expressions in sequence
    for (let i = 0; i < 3; i++) {
      // Wait for the current expression to be shown
      await waitFor(() => {
        expect(
          screen.getByRole("status", { name: `Expression ${i + 1} of 3` })
        ).toBeInTheDocument();
      });

      // Get the current target expression
      const targetExpression = screen
        .getByRole("status", { name: /target expression/i })
        .textContent?.toLowerCase()
        .replace("target expression:", "")
        .trim() as any;

      // Set the mock expression to match the target
      await act(async () => {
        // Strip emoji and any non-alphabetic characters
        const cleanExpression = targetExpression.replace(/[^a-z]/g, "");
        setMockExpression(cleanExpression);
      });

      // Simulate the interval running for 700ms (holdDuration)
      // Process frames every 150ms as the component does
      for (let j = 0; j < 6; j++) {
        await act(async () => {
          // Advance time by 150ms to match the component's interval
          jest.advanceTimersByTime(150);

          // Let React update
          await Promise.resolve();
        });
      }

      // Add a small delay to allow for state updates
      await act(async () => {
        await Promise.resolve();
      });

      // Wait for the next expression or success message
      await waitFor(() => {
        if (i < 2) {
          expect(
            screen.getByRole("status", { name: `Expression ${i + 2} of 3` })
          ).toBeInTheDocument();
        } else {
          expect(
            screen.getByText("Verification Successful!")
          ).toBeInTheDocument();
        }
      });
    }

    // Verify that onSuccess was called
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it("completes challenge when skipping one expression and showing others", async () => {
    const mockOnSuccess = jest.fn();
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    await act(async () => {
      screen.getByRole("button", { name: /start facial challenge/i }).click();
    });

    // Process first expression
    // Wait for the current expression to be shown
    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Expression 1 of 3" })
      ).toBeInTheDocument();
    });

    // Get the current target expression
    const firstTargetExpression = screen
      .getByRole("status", { name: /target expression/i })
      .textContent?.toLowerCase()
      .replace("target expression:", "")
      .trim() as any;

    // Set the mock expression to match the target
    await act(async () => {
      const cleanExpression = firstTargetExpression.replace(/[^a-z]/g, "");
      setMockExpression(cleanExpression);
    });

    // Simulate the interval running for 700ms
    for (let j = 0; j < 6; j++) {
      await act(async () => {
        jest.advanceTimersByTime(150);
        await Promise.resolve();
      });
    }

    // Wait for the second expression to appear
    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Expression 2 of 3" })
      ).toBeInTheDocument();
    });

    // Skip the second expression
    await act(async () => {
      screen.getByRole("button", { name: /skip/i }).click();
    });

    // Verify skips remaining decreased
    expect(screen.getByText("Skip (1 left)")).toBeInTheDocument();

    // Process third expression
    // Get the new target expression after skip
    const thirdTargetExpression = screen
      .getByRole("status", { name: /target expression/i })
      .textContent?.toLowerCase()
      .replace("target expression:", "")
      .trim() as any;

    // Set the mock expression to match the target
    await act(async () => {
      const cleanExpression = thirdTargetExpression.replace(/[^a-z]/g, "");
      setMockExpression(cleanExpression);
    });

    // Simulate the interval running for 700ms
    for (let j = 0; j < 6; j++) {
      await act(async () => {
        jest.advanceTimersByTime(150);
        await Promise.resolve();
      });
    }

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText("Verification Successful!")).toBeInTheDocument();
    });

    // Verify that onSuccess was called
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it("triggers timeout after 20 seconds", async () => {
    const mockOnSuccess = jest.fn();
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    await act(async () => {
      screen.getByRole("button", { name: /start facial challenge/i }).click();
    });

    // Wait for the first expression to be shown
    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Expression 1 of 3" })
      ).toBeInTheDocument();
    });

    // Get the current target expression
    const targetExpression = screen
      .getByRole("status", { name: /target expression/i })
      .textContent?.toLowerCase()
      .replace("target expression:", "")
      .trim() as any;

    // Set the mock expression to a different expression than the target
    await act(async () => {
      const cleanExpression = targetExpression.replace(/[^a-z]/g, "");
      // Set a different expression (e.g., if target is 'happy', set 'sad')
      const wrongExpression = cleanExpression === "happy" ? "sad" : "happy";
      setMockExpression(wrongExpression);
    });

    // Advance time by 20 seconds (20000ms)
    await act(async () => {
      jest.advanceTimersByTime(20000);
      await Promise.resolve();
    });

    // Verify timeout message is shown
    await waitFor(() => {
      expect(screen.getByText("Time's Up!")).toBeInTheDocument();
    });

    // Verify that onSuccess was called with "timeout"
    expect(mockOnSuccess).toHaveBeenCalledWith("timeout");
  });

  it("triggers bot detection when staying still too long", async () => {
    const mockOnSuccess = jest.fn();
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    await act(async () => {
      screen.getByRole("button", { name: /start facial challenge/i }).click();
    });

    // Wait for the first expression to be shown
    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Expression 1 of 3" })
      ).toBeInTheDocument();
    });

    // Get the current target expression
    const targetExpression = screen
      .getByRole("status", { name: /target expression/i })
      .textContent?.toLowerCase()
      .replace("target expression:", "")
      .trim() as any;

    // Set constant values and the target expression
    await act(async () => {
      const cleanExpression = targetExpression.replace(/[^a-z]/g, "");
      setMockConstantValues(true); // This will make the mock return constant values
      setMockExpression(cleanExpression);
    });

    // Simulate the interval running for 20 seconds
    // Process frames every 150ms to ensure variation
    for (let i = 0; i < 134; i++) {
      // 20 seconds / 150ms = ~134 frames
      await act(async () => {
        jest.advanceTimersByTime(150);
        await Promise.resolve();
      });
    }

    // Verify bot detection message is shown
    await waitFor(() => {
      expect(
        screen.getByText("Additional Verification Needed")
      ).toBeInTheDocument();
    });

    // Verify that onSuccess was called with true (bot detected)
    expect(mockOnSuccess).toHaveBeenCalledWith(true);

    // Clean up
    clearMockConstantValues();
  });
});
