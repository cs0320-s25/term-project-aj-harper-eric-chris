import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AudioCaptcha from './audio-captcha';

// Mock the tone detector
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

// Mock the Web Audio API
const mockAudioContext = {
  createAnalyser: jest.fn(),
  createMediaStreamSource: jest.fn(),
  createOscillator: jest.fn(),
  createGain: jest.fn(),
  destination: {},
};

global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

// Mock getUserMedia
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    }),
  },
});

describe('AudioCaptcha Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial state correctly', () => {
    render(<AudioCaptcha onSuccess={() => {}} />);
    
    expect(screen.getByText('Audio Tone Mimicry')).toBeInTheDocument();
    expect(screen.getByText(/Listen to a tone and then mimic it with your voice/)).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('starts recording when start button is clicked', async () => {
    render(<AudioCaptcha onSuccess={() => {}} />);
    
    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByText('Listen carefully:')).toBeInTheDocument();
    });
  });

  it('calls onSuccess when verification is successful', async () => {
    const mockOnSuccess = jest.fn();
    render(<AudioCaptcha onSuccess={mockOnSuccess} />);
    
    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles microphone access denial', async () => {
    // Mock getUserMedia to reject
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockRejectedValue(new Error('Permission denied')),
      },
    });

    render(<AudioCaptcha onSuccess={() => {}} />);
    
    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Error accessing microphone/)).toBeInTheDocument();
    });
  });
}); 