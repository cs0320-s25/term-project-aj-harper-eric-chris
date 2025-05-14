// __tests__/AudioCaptcha.test.tsx
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AudioCaptcha } from "./audio-captcha";
import { defaultToneDetector } from "../../lib/toneDetector";

// --- 1) Mock the tone detector ---
jest.mock("../../lib/toneDetector", () => ({
  defaultToneDetector: {
    generateRandomTone: jest.fn(),
    isFrequencyMatch: jest.fn(),
    processAudioData: jest.fn(),
    calculateMatchConfidence: jest.fn(),  // <-- make PitchVisualizer happy
  },
}));

// --- 2) Provide a fake MediaStream & AudioContext ---
const fakeTrack = ({ stop: jest.fn() } as unknown) as MediaStreamTrack;
const fakeStream = ({
  getTracks: () => [fakeTrack],
} as unknown) as MediaStream;

beforeAll(() => {
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: jest.fn().mockResolvedValue(fakeStream),
    },
  });

  // Minimal stub for AudioContext + analyser
  const mockAnalyser = {
    fftSize: 2048,
    smoothingTimeConstant: 0.3,
    getFloatTimeDomainData: jest.fn((arr: Float32Array) => {
      // fill with zeros; detector ignores raw input anyway
      for (let i = 0; i < arr.length; i++) arr[i] = 0;
    }),
  };
  const mockAudioCtx = {
    createAnalyser: () => mockAnalyser,
    createMediaStreamSource: () => ({ connect: () => {} }),
    createOscillator: () => ({ connect: () => {}, start: () => {}, stop: () => {} }),
    createGain: () => ({ connect: () => {}, gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }),
    destination: {},
    currentTime: 0,
  };
  // @ts-ignore
  global.AudioContext = jest.fn().mockImplementation(() => mockAudioCtx);
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("AudioCaptcha", () => {
  it("calls onSuccess(false) when user holds matching tone for 2s", async () => {
    // Arrange: tone = 440Hz; every processAudioData call is a perfect match
    (defaultToneDetector.generateRandomTone as jest.Mock).mockReturnValue(440);
    (defaultToneDetector.isFrequencyMatch as jest.Mock).mockReturnValue(true);
    (defaultToneDetector.processAudioData as jest.Mock).mockReturnValue({
      frequency: 440,
      amplitude: 0.5,
      confidenceScore: 1,
      isBotLike: false,
    });

    const onSuccess = jest.fn<void, [boolean | "timeout"]>();
    render(<AudioCaptcha onSuccess={onSuccess} />);

    // Act: start demo
    fireEvent.click(screen.getByRole("button", { name: /Start audio challenge/i }));
    // advance past demo → recording
    act(() => void jest.advanceTimersByTime(2500));

    // Begin recording
    fireEvent.click(screen.getByRole("button", { name: /Start Recording/i }));
    // Advance time enough to let 2s of matching accumulate
    act(() => void jest.advanceTimersByTime(2100));

    // Wait for onSuccess to fire
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(false);
    });
  });

  it("ends in failure (no onSuccess) when audio never matches", async () => {
    (defaultToneDetector.generateRandomTone as jest.Mock).mockReturnValue(330);
    (defaultToneDetector.isFrequencyMatch as jest.Mock).mockReturnValue(false);
    (defaultToneDetector.processAudioData as jest.Mock).mockReturnValue({
      frequency: 100,
      amplitude: 0,
      confidenceScore: 0,
      isBotLike: false,
    });

    const onSuccess = jest.fn<void, [boolean | "timeout"]>();
    render(<AudioCaptcha onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole("button", { name: /Start audio challenge/i }));
    act(() => void jest.advanceTimersByTime(2500));
    fireEvent.click(screen.getByRole("button", { name: /Start Recording/i }));
    // Advance past the 10s recording timeout
    act(() => void jest.advanceTimersByTime(10500));

    expect(onSuccess).not.toHaveBeenCalled();

    // The UI should now show "Verification Failed"
    expect(
      await screen.findByText("Verification Failed")
    ).toBeInTheDocument();

  });

  it("detects bot-like audio immediately", async () => {
    (defaultToneDetector.generateRandomTone as jest.Mock).mockReturnValue(500);
    (defaultToneDetector.processAudioData as jest.Mock)
      .mockReturnValueOnce({ frequency: 0, amplitude: 0, confidenceScore: 0, isBotLike: false })
      // next call → bot-like
      .mockReturnValue({ frequency: 500, amplitude: 0.8, confidenceScore: 1, isBotLike: true, botLikeReason: "fake" });

    const onSuccess = jest.fn<void, [boolean | "timeout"]>();
    render(<AudioCaptcha onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole("button", { name: /Start audio challenge/i }));
    act(() => void jest.advanceTimersByTime(2500));
    fireEvent.click(screen.getByRole("button", { name: /Start Recording/i }));
    // Advance a bit so processAudioData runs twice
    act(() => void jest.advanceTimersByTime(200));

    // Immediately we should see the bot-detected UI
    expect(
      await screen.findByText(/Synthetic\/computer-generated audio detected/i)
    ).toBeInTheDocument();

    expect(onSuccess).toHaveBeenCalledWith(true);
  });

  it("shows permission-error when microphone access is denied", async () => {
    // First call to getUserMedia rejects
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
      new Error("Denied")
    );

    const onSuccess = jest.fn();
    render(<AudioCaptcha onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole("button", { name: /Start audio challenge/i }));
    act(() => void jest.advanceTimersByTime(2500));
    fireEvent.click(screen.getByRole("button", { name: /Start Recording/i }));

    // Advance a bit so the rejection propagates
    await act(async () => {
      jest.runOnlyPendingTimers();
      // give React state a tick
      await Promise.resolve();
    });

    // Should show the microphone-permission UI...
    expect(
      screen.getByText(/Microphone Access Required/i)
    ).toBeInTheDocument();

    // And we do *not* call onSuccess
    expect(onSuccess).not.toHaveBeenCalled();
  });
});


describe("<AudioCaptcha /> failure path", () => {

  it("ends in failure (no onSuccess) when audio never matches", async () => {
    (defaultToneDetector.generateRandomTone as jest.Mock).mockReturnValue(500);
    (defaultToneDetector.processAudioData as jest.Mock)
      .mockReturnValueOnce({ frequency: 0, amplitude: 0, confidenceScore: 0, isBotLike: false })
      .mockReturnValue({ frequency: 200, amplitude: 0.8, confidenceScore: 1, isBotLike: false});

    const onSuccess = jest.fn<void, [boolean | "timeout"]>();
    render(<AudioCaptcha onSuccess={onSuccess} />);

    // 1) Click "Start audio challenge" and wait for demo → recording
    fireEvent.click(
      screen.getByRole("button", { name: /Start audio challenge/i })
    );
    act(() => {
      jest.advanceTimersByTime(2500);
    });

    // 2) Click "Start Recording"
    const recordBtn = await screen.findByRole("button", {
      name: /Start Recording/i,
    });
    fireEvent.click(recordBtn);

    // 3) Fast-forward past the 10 s recording timeout
    act(() => {
      jest.advanceTimersByTime(10_500);
    });

    // 4) onSuccess should never have been called
    expect(onSuccess).not.toHaveBeenCalled();

    // 5) UI should now display "Verification Failed"
    expect(
      await screen.findByText("Verification Failed")
    ).toBeInTheDocument();
  });
});
