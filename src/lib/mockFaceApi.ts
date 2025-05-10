import * as faceapi from "face-api.js";

// Mock expressions that can be detected
export type MockExpression =
  | "happy"
  | "angry"
  | "surprised"
  | "neutral"
  | "sad";

// Mock face detection result
export interface MockFaceDetection {
  expressions: {
    [key in MockExpression]: number;
  };
}

// Mock TinyFaceDetectorOptions class
class TinyFaceDetectorOptions {
  constructor() {}
}

// Mock implementation of face-api.js
export const mockFaceApi = {
  nets: {
    tinyFaceDetector: {
      loadFromUri: async () => Promise.resolve(),
    },
    faceExpressionNet: {
      loadFromUri: async () => Promise.resolve(),
    },
  },
  TinyFaceDetectorOptions,
  detectSingleFace: (video: HTMLVideoElement, options: any) => ({
    withFaceExpressions: async () => {
      // Return a mock face detection with the current expression
      const expressions = {
        happy: 0.6,
        angry: 0.6,
        surprised: 0.6,
        neutral: 0.6,
        sad: 0.6,
      };

      if (window.__MOCK_EXPRESSION) {
        // Set high confidence for the target expression
        expressions[window.__MOCK_EXPRESSION] = 0.9;
        // Set low confidence for all other expressions
        Object.keys(expressions).forEach((key) => {
          if (key !== window.__MOCK_EXPRESSION) {
            expressions[key as MockExpression] = 0.6;
          }
        });

        // Return the mock detection
        return {
          expressions,
          detection: {
            box: {
              x: 0,
              y: 0,
              width: 100,
              height: 100,
            },
          },
        };
      }

      // Return a default detection with low confidence for all expressions
      return {
        expressions,
        detection: {
          box: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
          },
        },
      };
    },
  }),
};

// Type declaration for the mock expression
declare global {
  interface Window {
    __MOCK_EXPRESSION?: MockExpression;
  }
}

// Function to set the mock expression
export const setMockExpression = (expression: MockExpression) => {
  window.__MOCK_EXPRESSION = expression;
};

// Function to clear the mock expression
export const clearMockExpression = () => {
  window.__MOCK_EXPRESSION = undefined;
};

// Export the mock as the default face-api
export default mockFaceApi;
