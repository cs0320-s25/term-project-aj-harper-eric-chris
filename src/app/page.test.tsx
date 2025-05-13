import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from './page';

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="mocked-facial-captcha">Facial Captcha</div>,
}));

jest.mock('../components/audio-captcha/audio-captcha', () => ({
  __esModule: true,
  default: ({ onSuccess }: { onSuccess: () => void }) => (
    <div data-testid="audio-captcha">
      <button onClick={onSuccess}>Verify Audio</button>
    </div>
  ),
}));

jest.mock('../components/ui/captcha-container', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="captcha-container">{children}</div>
  ),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders the main heading and description', () => {
  render(<Home />);
  
  expect(screen.getByText('MimicCaptcha')).toBeInTheDocument();
  expect(screen.getByText(/A multi-modal CAPTCHA system based on human mimicry capabilities/)).toBeInTheDocument();
});

test('renders both audio and facial captcha tabs', () => {
  render(<Home />);
  
  expect(screen.getByText('Audio Mimicry')).toBeInTheDocument();
  expect(screen.getByText('Facial Mimicry')).toBeInTheDocument();
});

test('shows audio captcha by default', () => {
  render(<Home />);
  
  expect(screen.getByTestId('audio-captcha')).toBeInTheDocument();
});

test('switches to facial captcha when facial tab is clicked', async () => {
  render(<Home />);
  
  const facialTab = screen.getByText('Facial Mimicry');
  fireEvent.click(facialTab);
  
  await waitFor(() => {
    expect(screen.getByTestId('mocked-facial-captcha')).toBeInTheDocument();
  });
});

test('shows success message when captcha is verified', async () => {
  render(<Home />);
  
  const verifyButton = screen.getByText('Verify Audio');
  fireEvent.click(verifyButton);
  
  await waitFor(() => {
    expect(screen.getByText('Verification Successful!')).toBeInTheDocument();
  });
});

test('allows trying again after successful verification', async () => {
  render(<Home />);
  
  const verifyButton = screen.getByText('Verify Audio');
  fireEvent.click(verifyButton);

  await waitFor(() => {
    expect(screen.getByText('Verification Successful!')).toBeInTheDocument();
  });
  
  const tryAgainButton = screen.getByText('Try Again');
  fireEvent.click(tryAgainButton);
  
  expect(screen.getByTestId('audio-captcha')).toBeInTheDocument();
});

test('renders footer with current year', () => {
  render(<Home />);
  
  const currentYear = new Date().getFullYear();
  expect(screen.getByText(`© ${currentYear} MimicCaptcha. Privacy-first human verification.`)).toBeInTheDocument();
});
