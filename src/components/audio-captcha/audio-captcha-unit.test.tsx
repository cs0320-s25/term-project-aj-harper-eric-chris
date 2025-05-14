import { ToneDetector } from "../../lib/toneDetector";
describe("ToneDetector core unit tests", () => {
  let detector: ToneDetector;

  beforeEach(() => {
    // use a fresh detector, turn off bot‐detection for simplicity
    detector = new ToneDetector({
      minFrequency: 100,
      maxFrequency: 2000,
      tolerance: 0.2,
      enableBotDetection: false,
    });
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe("isFrequencyMatch()", () => {
    it("returns true for direct match within tolerance", () => {
      expect(detector.isFrequencyMatch(440, 440)).toBe(true);
      // within 10% of 440
      expect(detector.isFrequencyMatch(440 * 1.1, 440)).toBe(true);
    });

    it("returns true for octave-up match", () => {
      const target = 300;
      const user = target * 2 * (1 + detector["options"].tolerance * 0.5);
      expect(detector.isFrequencyMatch(user, target)).toBe(true);
    });

    it("returns true for octave-down match", () => {
      const target = 300;
      const user =
        (target / 2) * (1 - detector["options"].tolerance * 0.5);
      expect(detector.isFrequencyMatch(user, target)).toBe(true);
    });

    it("returns false below minFrequency", () => {
      expect(detector.isFrequencyMatch(50, 440)).toBe(false);
    });

    it("returns false when outside all ranges", () => {
      expect(detector.isFrequencyMatch(1000, 400)).toBe(false);
    });
  });

  describe("calculateMatchConfidence()", () => {
    it("is 1 for perfect match", () => {
      const c = detector.calculateMatchConfidence(440, 440);
      expect(c).toBeCloseTo(1);
    });

    it("drops off with distance", () => {
      const tol = detector["options"].tolerance;
      const off = 440 + 0.5 * 440 * tol;
      const c = detector.calculateMatchConfidence(off, 440);
      expect(c).toBeLessThan(1);
      expect(c).toBeGreaterThan(0);
    });

    it("handles octave up with reduced max", () => {
      const target = 300;
      const user = target * 2; // exact octave
      const c = detector.calculateMatchConfidence(user, target);
      // octave matches are scaled by 0.8 at best
      expect(c).toBeLessThanOrEqual(0.8);
      expect(c).toBeGreaterThan(0);
    });

    it("returns 0 below minFrequency", () => {
      expect(detector.calculateMatchConfidence(50, 440)).toBe(0);
    });
  });

  describe("generateRandomTone()", () => {
    it("always returns between 220 and 440 inclusive", () => {
      for (let i = 0; i < 1000; i++) {
        const f = detector.generateRandomTone();
        expect(f).toBeGreaterThanOrEqual(220);
        expect(f).toBeLessThanOrEqual(440);
      }
    });
  });
  describe("processAudioData()", () => {
    it("returns zeroed result for pure silence (below noise floor)", () => {
      const silent = new Float32Array(2048).fill(0);
      const r = detector.processAudioData(silent);
      expect(r.frequency).toBe(0);
      expect(r.confidenceScore).toBe(0);
      expect(r.isBotLike).toBe(false);
    });
    it("enforces rate-limit: second call within 50ms yields last freq but zero confidence", () => {
      const noise = Float32Array.from({ length: 2048 }, () => Math.random() * 2 - 1);
      const first = detector.processAudioData(noise);
      // immediate second call
      const second = detector.processAudioData(noise);
      expect(second.frequency).toBe(first.frequency);
      expect(second.confidenceScore).toBe(0);
    });
  });
  describe("replayBuffer & pruning", () => {
    it("pruneReplayBuffer() drops entries older than 10min", () => {
      const now = Date.now();
      ;(detector as any).replayBuffer = [
        { frequency: 1, amplitude: 1, confidenceScore: 1, isBotLike: false, time: now - 10*60*1000 - 1 },
        { frequency: 2, amplitude: 2, confidenceScore: 2, isBotLike: false, time: now },
      ];
      detector.pruneReplayBuffer();
      const buf = (detector as any).replayBuffer;
      expect(buf).toHaveLength(1);
      expect(buf[0].frequency).toBe(2);
    });
  });
  describe("private helpers via any-cast", () => {
    it("parabolicInterpolation returns tau for symmetric triplet", () => {
      const arr = new Float32Array([2, 1, 2]);
      const v = (detector as any).parabolicInterpolation(arr, 1);
      // exact symmetry → peak at 1
      expect(v).toBeCloseTo(1);
    });
  });
});
