import React, { useState } from "react";
import { AudioCaptcha } from "./audio-captcha/audio-captcha";
import ExpressionSequence from "./facial-captcha/facial-captcha";
import { ErrorBoundary } from "react-error-boundary";

/**
 * MimicCaptcha component props
 */
export interface MimicCaptchaProps {
  /**
   * Function to call when captcha is successfully completed
   */
  onSuccess: (status: boolean | "timeout") => void;

  /**
   * Function to call when captcha fails (max attempts reached)
   */
  onFailure?: () => void;

  /**
   * Initial captcha type to show
   * @default "audio"
   */
  defaultType?: "audio" | "facial";

  /**
   * Whether to show tabs for switching between captcha types
   * @default true
   */
  showTypeSwitcher?: boolean;

  /**
   * Maximum number of attempts allowed before triggering onFailure
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Difficulty level for the captcha
   * @default "medium"
   */
  difficulty?: "easy" | "medium" | "hard";

  /**
   * Size of the captcha container
   * @default "default"
   */
  size?: "small" | "default" | "large";

  /**
   * Custom classes for container
   */
  className?: string;

  /**
   * Custom styles for container
   */
  style?: React.CSSProperties;

  /**
   * Whether to enable dark mode
   * @default false
   */
  darkMode?: boolean;

  /**
   * Whether to show the success message after verification
   * @default true
   */
  showSuccessMessage?: boolean;

  /**
   * Custom success message
   */
  successMessage?: string;

  /**
   * Time in milliseconds to show success message before calling onSuccess
   * @default 1500
   */
  successMessageDuration?: number;
}

/**
 * Default props for the MimicCaptcha component
 */
const defaultProps: Partial<MimicCaptchaProps> = {
  defaultType: "audio",
  showTypeSwitcher: true,
  maxAttempts: 3,
  difficulty: "medium",
  size: "default",
  className: "",
  darkMode: false,
  showSuccessMessage: true,
  successMessage: "Human verification successful!",
  successMessageDuration: 1500,
};

/**
 * MimicCaptcha - Main component that allows users to verify they are human
 * through audio tone matching or facial expression matching
 */
export function MimicCaptcha(props: MimicCaptchaProps) {
  // Merge default props with user props
  const {
    onSuccess,
    onFailure,
    defaultType,
    showTypeSwitcher,
    maxAttempts,
    difficulty,
    size,
    className,
    style,
    darkMode,
    showSuccessMessage,
    successMessage,
    successMessageDuration,
  } = { ...defaultProps, ...props };

  // State for which captcha type is active
  const [captchaType, setCaptchaType] = useState<"audio" | "facial">(
    defaultType!
  );
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showingSuccess, setShowingSuccess] = useState(false);

  // Handle success from the captcha components
  const handleCaptchaSuccess = (status: boolean | "timeout") => {
    if (status === "timeout") {
      console.log("CAPTCHA timed out!");
      setCaptchaVerified(false);
    } else if (status === true) {
      console.log("Bot detected!");
      setCaptchaVerified(false);
    } else {
      setCaptchaVerified(true);
      if (showSuccessMessage) {
        setShowingSuccess(true);
        setTimeout(() => {
          setShowingSuccess(false);
          onSuccess(status);
        }, successMessageDuration);
      } else {
        onSuccess(status);
      }
    }
  };

  // Handle failure from the captcha components
  const handleCaptchaFailure = () => {
    setAttempts(attempts + 1);
    if (attempts + 1 >= maxAttempts! && onFailure) {
      onFailure();
    }
  };

  // Reset the captcha
  const resetCaptcha = () => {
    setCaptchaVerified(false);
    setShowingSuccess(false);
  };

  // Error fallback component
  const ErrorFallback = ({
    error,
    resetErrorBoundary,
  }: {
    error: Error;
    resetErrorBoundary: () => void;
  }) => {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-900 rounded-lg">
        <h2 className="text-lg font-bold text-red-600 dark:text-red-300 mb-2">
          Error:
        </h2>
        <pre className="text-sm text-red-500 dark:text-red-300 bg-red-100 dark:bg-red-800 p-2 rounded mb-4 overflow-auto max-w-full">
          {error.message}
        </pre>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          aria-label="Try again"
        >
          Try again
        </button>
      </div>
    );
  };

  // Generate size classes
  const sizeClasses = {
    small: "max-w-xs",
    default: "max-w-md",
    large: "max-w-lg",
  };

  // Base container classes
  const containerClass = `${
    darkMode ? "dark" : ""
  } bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 ${
    sizeClasses[size!]
  } ${className}`;
  const tabClass = "py-2 px-4 rounded-md transition-colors";
  const activeTabClass = "bg-blue-500 text-white";
  const inactiveTabClass =
    "bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600";

  // Pass difficulty to captcha components
  const captchaProps = {
    onSuccess: handleCaptchaSuccess,
    onFailure: handleCaptchaFailure,
    difficulty,
  };

  if (captchaVerified && showingSuccess) {
    return (
      <div
        className={containerClass}
        style={style}
        data-testid="mimic-captcha-success"
      >
        <div className="text-center py-4">
          <div className="text-green-500 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">
            Verification Successful!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {successMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass} style={style} data-testid="mimic-captcha">
      <div className="flex items-center mb-4">
        <div className="mr-3 bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Verify you're human
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Complete the mimicry challenge to continue
          </p>
        </div>
      </div>

      {showTypeSwitcher && (
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setCaptchaType("audio")}
            className={`flex-1 ${tabClass} ${
              captchaType === "audio" ? activeTabClass : inactiveTabClass
            }`}
            aria-pressed={captchaType === "audio"}
            aria-label="Switch to audio captcha"
          >
            <span className="flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              Audio Mimicry
            </span>
          </button>
          <button
            onClick={() => setCaptchaType("facial")}
            className={`flex-1 ${tabClass} ${
              captchaType === "facial" ? activeTabClass : inactiveTabClass
            }`}
            aria-pressed={captchaType === "facial"}
            aria-label="Switch to facial expression captcha"
          >
            <span className="flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Facial Mimicry
            </span>
          </button>
        </div>
      )}

      <div className="captcha-content">
        {captchaType === "audio" ? (
          <AudioCaptcha {...captchaProps} />
        ) : (
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <ExpressionSequence {...captchaProps} />
          </ErrorBoundary>
        )}
      </div>

      {maxAttempts! > 1 && attempts > 0 && (
        <div className="mt-2 text-xs text-right text-gray-500 dark:text-gray-400">
          Attempts: {attempts}/{maxAttempts}
        </div>
      )}
    </div>
  );
}

export default MimicCaptcha;
