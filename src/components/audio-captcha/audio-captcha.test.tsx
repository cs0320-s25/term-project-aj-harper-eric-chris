import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AudioCaptcha from './audio-captcha';

jest.mock('../../lib/toneDetector', () => ({
  defaultToneDetector: {
    generateRandomTone: jest.fn().mockReturnValue(440),
    isFrequencyMatch: jest.fn().mockReturnValue(true),
    processAudioData: jest.fn().mockReturnValue({
      frequency: 440,
      amplitude: 0.5,
      confidenceScore: 1,
      isBotLike: false,
    }),
  },
}));

const mockAudioContext = {
  createAnalyser: jest.fn(),
  createMediaStreamSource: jest.fn(),
  createOscillator: jest.fn(),
  createGain: jest.fn(),
  destination: {},
};

const mockGetUserMedia = jest.fn().mockResolvedValue({
  getTracks: () => [{ stop: jest.fn() }],
});

global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    }),
  },
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

test('renders initial state correctly', () => {
  render(<AudioCaptcha onSuccess={() => {}} />);
  expect(screen.getByText('Audio Tone Mimicry')).toBeInTheDocument();
  expect(screen.getByText(/Listen to a tone and then mimic it with your voice/)).toBeInTheDocument();
  expect(screen.getByText('Start')).toBeInTheDocument();
});

test('starts recording when start button is clicked', async () => {
  render(<AudioCaptcha onSuccess={() => {}} />);
  const startButton = screen.getByText('Start');
  fireEvent.click(startButton);
  await waitFor(() => {
    expect(screen.getByText('Listen carefully:')).toBeInTheDocument();
  });
});

test('calls onSuccess when verification is successful', async () => {
  const mockOnSuccess = jest.fn();
  render(<AudioCaptcha onSuccess={mockOnSuccess} />);
  fireEvent.click(screen.getByRole('button', { name: /^Start$/ }));
  act(() => {
    jest.advanceTimersByTime(3000);
  });
  expect(
    await screen.findByText(/Your turn:/i)
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Start Recording$/ }));
  act(() => {
    jest.advanceTimersByTime(50);
  });
  act(() => {
    jest.advanceTimersByTime(11000);
  });
  //here i need to implement some changes

  await waitFor(() => {
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
  });

});

test('shows an error when microphone access is denied', async () => {
  mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
  render(<AudioCaptcha onSuccess={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /^Start$/ }));
  act(() => {
    jest.advanceTimersByTime(5000);
  });
  const recordBtn = await screen.findByRole('button', {
    name: /^Start Recording$/,
  });
  expect(recordBtn).toBeInTheDocument();
  fireEvent.click(recordBtn);
  expect(
    await screen.findByText(/We couldn't access your microphone/i)
  ).toBeInTheDocument();
});
