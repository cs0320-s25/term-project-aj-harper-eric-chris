import React, { useState } from "react";
import { AudioCaptcha } from "./audio-captcha/audio-captcha";
import { ExpressionSequence } from "./facial-captcha/facial-captcha";

export interface MimicCaptchaProps {
  /**
   * Function to call when captcha is successfully completed
   */
  onSuccess: () => void;
  /**
   * Initial captcha type to show (audio or facial)
   * @default "audio"
   */
  defaultType?: "audio" | "facial";
  /**
   * Whether to show tabs for switching between captcha types
   * @default true
   */
  showTypeSwitcher?: boolean;
  /**
   * Custom classes for container
   */
  className?: string;
  /**
   * Custom styles for container
   */
  style?: React.CSSProperties;
}

/**
 * MimicCaptcha - Main component that allows users to verify they are human
 * through audio tone matching or facial expression matching
 */
export function MimicCaptcha({
  onSuccess,
  defaultType = "audio",
  showTypeSwitcher = true,
  className = "",
  style = {},
}: MimicCaptchaProps) {
  // State for which captcha type is active
  const [captchaType, setCaptchaType] = useState<"audio" | "facial">(
    defaultType
  );
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const handleCaptchaSuccess = () => {
    setCaptchaVerified(true);
    onSuccess();
  };

  const resetCaptcha = () => {
    setCaptchaVerified(false);
  };

  // Style variables
  const containerClass = `bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`;
  const tabClass = "py-2 px-4 rounded-md transition-colors";
  const activeTabClass = "bg-blue-500 text-white";
  const inactiveTabClass =
    "bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600";

  if (captchaVerified) {
    return (
      <div className={containerClass} style={style}>
        <div className="text-center">
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
          <h2 className="text-2xl font-bold mb-2">Verification Successful!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            You have successfully verified that you are human.
          </p>
          <button
            onClick={resetCaptcha}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            aria-label="Try the captcha challenge again"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass} style={style}>
      <div className="flex items-center mb-6">
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
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            className={`${tabClass} ${
              captchaType === "audio" ? activeTabClass : inactiveTabClass
            }`}
            onClick={() => setCaptchaType("audio")}
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
            className={`${tabClass} ${
              captchaType === "facial" ? activeTabClass : inactiveTabClass
            }`}
            onClick={() => setCaptchaType("facial")}
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

      <div className="space-y-4">
        {captchaType === "audio" ? (
          <div role="tabpanel" aria-label="Audio captcha challenge">
            <AudioCaptcha onSuccess={handleCaptchaSuccess} />
          </div>
        ) : (
          <div role="tabpanel" aria-label="Facial expression captcha challenge">
            <ExpressionSequence onSuccess={handleCaptchaSuccess} />
          </div>
        )}
      </div>
    </div>
  );
}

export default MimicCaptcha;
