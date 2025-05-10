require("@testing-library/jest-dom");

// Mock MediaStream
global.MediaStream = jest.fn().mockImplementation(() => ({
  getTracks: () => [],
  getVideoTracks: () => [],
}));

// Mock the window.matchMedia function
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock the navigator.mediaDevices.getUserMedia function
Object.defineProperty(navigator, "mediaDevices", {
  writable: true,
  value: {
    getUserMedia: jest
      .fn()
      .mockImplementation(() => Promise.resolve(new MediaStream())),
  },
});
