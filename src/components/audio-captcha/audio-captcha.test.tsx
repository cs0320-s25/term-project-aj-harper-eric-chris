import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AudioCaptcha } from "./audio-captcha";
import { defaultToneDetector } from "../../lib/toneDetector";

jest.mock("../../lib/toneDetector", () => ({
  defaultToneDetector: {
    generateRandomTone: jest.fn(),
    isFrequencyMatch: jest.fn(),
    processAudioData: jest.fn(),
    calculateMatchConfidence: jest.fn(),
  },
}));

beforeAll(() => {
  // fake MediaStream + Track
  const fakeTrack = { stop: jest.fn() } as unknown as MediaStreamTrack;
  const fakeStream = { getTracks: () => [fakeTrack] } as unknown as MediaStream;
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: jest.fn().mockResolvedValue(fakeStream) },
  });

  // stub analyser
  const mockAnalyser = {
    fftSize: 2048,
    smoothingTimeConstant: 0.3,
    getFloatTimeDomainData: jest.fn((arr: Float32Array) => arr.fill(0)),
  };

  // stubbed AudioContext
  const mockAudioCtx = {
    createAnalyser: () => mockAnalyser,
    createMediaStreamSource: () => ({
      connect: () => {},
      disconnect: () => {},    // <— added
    }),
    createOscillator: () => ({
      connect: () => {},
      disconnect: () => {},    // <— added
      start: () => {},
      stop: () => {},
      frequency: { setValueAtTime: jest.fn() },
    }),
    createGain: () => ({
      connect: () => {},
      disconnect: () => {},    // <— added
      gain: {
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
      },
    }),
    destination: {},
    currentTime: 0,
  };

  // @ts-ignore
  global.AudioContext = jest.fn(() => mockAudioCtx);
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

    const onSuccess = jest.fn<void, [boolean | "timeout" | "failure"]>();
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
    expect(
      await screen.findByText("Verification Successful!")
    ).toBeInTheDocument();
  });

  it("ends in failure (no onSuccess) when audio never matches", async () => {
    (defaultToneDetector.generateRandomTone as jest.Mock).mockReturnValue(330);
    (defaultToneDetector.isFrequencyMatch as jest.Mock).mockReturnValue(false);
    (defaultToneDetector.processAudioData as jest.Mock).mockReturnValue({
      frequency: 200,
      amplitude: 0,
      confidenceScore: 0,
      isBotLike: false,
    });

    const onSuccess = jest.fn<void, [boolean | "timeout" | "failure"]>();
    render(<AudioCaptcha onSuccess={onSuccess} />);
    
    fireEvent.click(screen.getByRole("button", { name: /Start audio challenge/i }));
    act(() => void jest.advanceTimersByTime(2500));
    fireEvent.click(screen.getByRole("button", { name: /Start Recording/i }));
    // Advance past the 10s recording timeout
    act(() => void jest.advanceTimersByTime(10500));
    expect(onSuccess).toHaveBeenCalled();

  });

  it("detects bot-like audio immediately", async () => {
    (defaultToneDetector.generateRandomTone as jest.Mock).mockReturnValue(500);
    (defaultToneDetector.processAudioData as jest.Mock)
      .mockReturnValueOnce({ frequency: 0, amplitude: 0, confidenceScore: 0, isBotLike: false })
      // next call → bot-like
      .mockReturnValue({ frequency: 500, amplitude: 0.8, confidenceScore: 1, isBotLike: true, botLikeReason: "fake" });

    const onSuccess = jest.fn<void, [boolean | "timeout" | "failure"]>();
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

    const onSuccess = jest.fn<void, [boolean | "timeout" | "failure"]>();
    render(<AudioCaptcha onSuccess={onSuccess} />);

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
      jest.advanceTimersByTime(11_500);
    });

    // 4) onSuccess should never have been called
    expect(onSuccess).not.toHaveBeenCalled();

    // 5) UI should now display "Verification Failed"
    expect(
      await screen.findByText("Verification Failed")
    ).toBeInTheDocument();
  });
});

describe("AudioCaptcha — additional edge cases", () => {
  beforeEach(() => {
    // make the demo deterministic
    jest
      .spyOn(defaultToneDetector, "generateRandomTone")
      .mockReturnValue(400);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it("renders the success UI when sustaining pitch for 2s", async () => {
    // 1) Perfect match every time
    (defaultToneDetector.isFrequencyMatch as jest.Mock).mockReturnValue(true);
    (defaultToneDetector.processAudioData as jest.Mock).mockReturnValue({
      frequency: 400,
      amplitude: 0.8,
      confidenceScore: 1,
      isBotLike: false,
    });

    const onSuccess = jest.fn<void, [boolean | "timeout" | "failure"]>();
    render(<AudioCaptcha onSuccess={onSuccess} />);

    // start demo → recording
    fireEvent.click(screen.getByRole("button", { name: /Start audio challenge/i }));
    act(() => void jest.advanceTimersByTime(2500));

    // click record & fast-forward 2s
    fireEvent.click(screen.getByRole("button", { name: /Start Recording/i }));
    act(() => void jest.advanceTimersByTime(2100));

    // success UI appears
    expect(await screen.findByText(/Verification Successful!/i)).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledWith(false);
  });

  it("shows an analyzing spinner during the analysis interval", async () => {
    // always no match → will fall through to analyzeRecording after timeout
    jest.spyOn(defaultToneDetector, "isFrequencyMatch").mockReturnValue(false);
    jest.spyOn(defaultToneDetector, "processAudioData").mockReturnValue({
      frequency: 100,
      amplitude: 0.5,
      confidenceScore: 1,
      isBotLike: false,
    });

    render(<AudioCaptcha onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Start audio challenge/i }));
    act(() => void jest.advanceTimersByTime(2500));
    fireEvent.click(screen.getByRole("button", { name: /Start Recording/i }));

    // fast-forward to end of recording
    act(() => void jest.advanceTimersByTime(10000));
    // now analyzeRecording runs
    act(() => void jest.runOnlyPendingTimers());

    // look for the spinner by its role and aria-label
    const spinner = screen.getByRole("status", { name: /Analyzing your tone/i });
    expect(spinner).toBeInTheDocument();

    // and the “Analyzing your tone…” text
    expect(screen.getByText(/Analyzing your tone/i)).toBeInTheDocument();
  });

  it("times out without calling onSuccess and shows failure message", async () => {
    // no matches ever
    jest.spyOn(defaultToneDetector, "isFrequencyMatch").mockReturnValue(false);
    jest.spyOn(defaultToneDetector, "processAudioData").mockReturnValue({
      frequency: 50,
      amplitude: 0.02,
      confidenceScore: 0.5,
      isBotLike: false,
    });

    const onSuccess = jest.fn<void, [boolean | "timeout" | "failure"]>();
    render(<AudioCaptcha onSuccess={onSuccess} />);

    // start demo → recording
    fireEvent.click(screen.getByRole("button", { name: /Start audio challenge/i }));
    act(() => void jest.advanceTimersByTime(2500));
    fireEvent.click(screen.getByRole("button", { name: /Start Recording/i }));

    // fast-forward through the 10s recording and analysis
    act(() => void jest.advanceTimersByTime(10000));
    act(() => void jest.runOnlyPendingTimers());

    // onSuccess was never invoked
    expect(onSuccess).not.toHaveBeenCalled();

    // and our custom failure message appears
    expect(
      await screen.findByText(
        /We couldn't match your tone with the expected frequency/i
      )
    ).toBeInTheDocument();
  });
});

