declare module "@tensorflow-models/face-landmarks-detection" {
  // Main types
  export enum SupportedModels {
    MediaPipeFaceMesh = "MediaPipeFaceMesh",
  }

  export interface MediaPipeFaceMeshTfjsModelConfig {
    runtime: "tfjs";
    maxFaces?: number;
    refineLandmarks: boolean;
    detectorModelUrl?: string;
    landmarkModelUrl?: string;
  }

  export interface MediaPipeFaceMeshMediaPipeModelConfig {
    runtime: "mediapipe";
    maxFaces?: number;
    refineLandmarks: boolean;
    solutionPath?: string;
  }

  export interface Face {
    keypoints: Array<{
      x: number;
      y: number;
      z?: number;
      name?: string;
    }>;
    box: {
      xMin: number;
      xMax: number;
      yMin: number;
      yMax: number;
      width: number;
      height: number;
    };
  }

  export interface FaceLandmarksDetector {
    estimateFaces(
      image:
        | ImageData
        | HTMLImageElement
        | HTMLCanvasElement
        | HTMLVideoElement,
      config?: {
        flipHorizontal?: boolean;
        staticImageMode?: boolean;
      }
    ): Promise<Face[]>;
  }

  export function createDetector(
    model: SupportedModels.MediaPipeFaceMesh,
    config:
      | MediaPipeFaceMeshTfjsModelConfig
      | MediaPipeFaceMeshMediaPipeModelConfig
  ): Promise<FaceLandmarksDetector>;
}

// Add declaration for @mediapipe/face_mesh
declare module "@mediapipe/face_mesh" {
  export interface Results {
    multiFaceLandmarks: Array<Array<{ x: number; y: number; z: number }>>;
    image:
      | ImageBitmap
      | HTMLImageElement
      | HTMLVideoElement
      | HTMLCanvasElement;
  }

  export class FaceMesh {
    constructor(options?: {
      locateFile?: (file: string) => string;
      maxNumFaces?: number;
      refineLandmarks?: boolean;
    });

    onResults(callback: (results: Results) => void): void;
    send(
      input:
        | ImageBitmap
        | HTMLImageElement
        | HTMLVideoElement
        | HTMLCanvasElement
    ): Promise<void>;
    setOptions(options: {
      maxNumFaces?: number;
      refineLandmarks?: boolean;
    }): void;
    close(): Promise<void>;
  }
}
