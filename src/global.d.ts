declare module "dynamic-time-warping" {
  export default class DynamicTimeWarping {
    constructor(
      series1: number[] | number[][],
      series2: number[] | number[][],
      distanceFunction?: (a: number, b: number) => number
    );

    getDistance(): number;
    getPath(): [number, number][];
  }
}

declare module "meyda" {
  interface MeydaAnalyzer {
    start(): void;
    stop(): void;
  }

  interface MeydaOptions {
    audioContext: AudioContext;
    source: MediaStreamAudioSourceNode;
    bufferSize?: number;
    featureExtractors?: string[];
    inputs?: number;
    callback?: (features: any) => void;
  }

  export function createMeydaAnalyzer(options: MeydaOptions): MeydaAnalyzer;
}
