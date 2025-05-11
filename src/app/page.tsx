"use client";

import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import CaptchaContainer from "../components/ui/captcha-container";
import AudioCaptcha from "../components/audio-captcha/audio-captcha";

// Import the facial captcha component with dynamic loading
const FacialCaptcha = dynamic(
  () => import("../components/facial-captcha/facial-captcha"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">
          Loading face detection...
        </p>
      </div>
    ),
  }
);

// Error fallback component
const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900 rounded-lg">
      <h2 className="text-lg font-bold text-red-600 dark:text-red-300 mb-2">
        Something went wrong:
      </h2>
      <pre className="text-sm text-red-500 dark:text-red-300 bg-red-100 dark:bg-red-800 p-4 rounded mb-4 overflow-auto max-w-full">
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
};

export default function Home() {
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [isBotDetected, setIsBotDetected] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);
  const [selectedCaptchaType, setSelectedCaptchaType] = useState<
    "audio" | "facial"
  >("audio");

  const handleCaptchaSuccess = (status: boolean | "timeout") => {
    console.log("CAPTCHA verified successfully!");
    setCaptchaVerified(true);
    if (status === "timeout") {
      setIsTimeout(true);
      setIsBotDetected(false);
    } else {
      setIsTimeout(false);
      setIsBotDetected(status);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 text-primary-600 dark:text-primary-400">
          MimicCaptcha
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-md">
          A multi-modal CAPTCHA system based on human mimicry capabilities
        </p>
      </header>

      <main className="w-full max-w-md">
        {captchaVerified ? (
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center"
            role="alert"
            aria-live="assertive"
          >
            <div
              className={`${
                isBotDetected
                  ? "text-red-500"
                  : isTimeout
                  ? "text-yellow-500"
                  : "text-green-500"
              } mb-4`}
              role="img"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                {isBotDetected ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                ) : isTimeout ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                )}
              </svg>
            </div>
            <h2
              className="text-2xl font-bold mb-2"
              role="heading"
              aria-level={2}
            >
              {isBotDetected
                ? "Suspicious Activity Detected"
                : isTimeout
                ? "Time's Up!"
                : "Verification Successful!"}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {isBotDetected
                ? "Please try again."
                : isTimeout
                ? "You took too long to complete the challenge. Please try again."
                : "You have successfully verified that you are human."}
            </p>
            <button
              onClick={() => {
                setCaptchaVerified(false);
                setIsBotDetected(false);
                setIsTimeout(false);
              }}
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              aria-label="Try verification again"
            >
              Try Again
            </button>
          </div>
        ) : (
          <CaptchaContainer>
            <Tabs
              defaultValue="audio"
              onValueChange={(value) =>
                setSelectedCaptchaType(value as "audio" | "facial")
              }
              className="w-full"
              aria-label="CAPTCHA type selection"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger
                  value="audio"
                  aria-selected={selectedCaptchaType === "audio"}
                  aria-controls="audio-tab"
                >
                  <span className="flex items-center">
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
                </TabsTrigger>
                <TabsTrigger
                  value="facial"
                  aria-selected={selectedCaptchaType === "facial"}
                  aria-controls="facial-tab"
                >
                  <span className="flex items-center">
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
                </TabsTrigger>
              </TabsList>
              <TabsContent value="audio" className="space-y-4">
                <AudioCaptcha onSuccess={handleCaptchaSuccess} />
              </TabsContent>
              <TabsContent value="facial" className="space-y-4">
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <Suspense
                    fallback={
                      <div
                        className="flex flex-col items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg"
                        role="status"
                        aria-label="Loading facial recognition"
                      >
                        <div
                          className="w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin mb-4"
                          aria-hidden="true"
                        ></div>
                        <p className="text-gray-600 dark:text-gray-300">
                          Preparing face detection...
                        </p>
                      </div>
                    }
                  >
                    <FacialCaptcha onSuccess={handleCaptchaSuccess} />
                  </Suspense>
                </ErrorBoundary>
              </TabsContent>
            </Tabs>
          </CaptchaContainer>
        )}
      </main>

      <footer
        className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm"
        role="contentinfo"
      >
        <p>
          © {new Date().getFullYear()} MimicCaptcha. Privacy-first human
          verification.
        </p>
      </footer>
    </div>
  );
}
