import React, { useState } from "react";
import { MimicCaptcha } from "./components/MimicCaptcha";
import { ExpressionSequence } from "./components/facial-captcha/facial-captcha";
import { AudioCaptcha } from "./components/audio-captcha/audio-captcha";
import { ErrorBoundary } from "react-error-boundary";

/**
 * Main App component that replaces the Next.js page structure
 * This still allows you to use the original components with the new setup
 */
const App: React.FC = () => {
  const [tabView, setTabView] = useState<
    "standalone" | "original" | "individual"
  >("standalone");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [selectedCaptchaType, setSelectedCaptchaType] = useState<
    "audio" | "facial"
  >("audio");

  const handleCaptchaSuccess = () => {
    console.log("CAPTCHA verified successfully!");
    alert("CAPTCHA verified successfully!");
    setCaptchaVerified(true);
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 text-blue-600 dark:text-blue-400">
          MimicCaptcha
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-md">
          A multi-modal CAPTCHA system based on human mimicry capabilities
        </p>
      </header>

      {/* Tab selection */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex justify-center space-x-4">
        <button
          onClick={() => setTabView("standalone")}
          className={`py-2 px-4 rounded ${
            tabView === "standalone"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Standalone Component
        </button>
        <button
          onClick={() => setTabView("original")}
          className={`py-2 px-4 rounded ${
            tabView === "original"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Original Setup
        </button>
        <button
          onClick={() => setTabView("individual")}
          className={`py-2 px-4 rounded ${
            tabView === "individual"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Individual Components
        </button>
      </div>

      <main className="w-full max-w-md">
        {tabView === "standalone" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Standalone MimicCaptcha Component
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This is the main component you'd import in your projects:
            </p>
            <MimicCaptcha
              onSuccess={handleCaptchaSuccess}
              showTypeSwitcher={true}
              defaultType="audio"
            />
          </div>
        )}

        {tabView === "original" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Original Implementation
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This shows how the components work together like in the original
              app:
            </p>

            {captchaVerified ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
                <div className="text-green-500 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  Verification Successful!
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  You have successfully verified that you are human.
                </p>
                <button
                  onClick={() => setCaptchaVerified(false)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div>
                <div className="tabs flex mb-4">
                  <button
                    onClick={() => setSelectedCaptchaType("audio")}
                    className={`flex-1 py-2 px-4 rounded-tl rounded-bl border-r ${
                      selectedCaptchaType === "audio"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    <span className="flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
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
                    onClick={() => setSelectedCaptchaType("facial")}
                    className={`flex-1 py-2 px-4 rounded-tr rounded-br ${
                      selectedCaptchaType === "facial"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    <span className="flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
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

                <div className="captcha-container bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                  {selectedCaptchaType === "audio" ? (
                    <AudioCaptcha onSuccess={handleCaptchaSuccess} />
                  ) : (
                    <ErrorBoundary FallbackComponent={ErrorFallback}>
                      <ExpressionSequence onSuccess={handleCaptchaSuccess} />
                    </ErrorBoundary>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tabView === "individual" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Individual Components
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Access the individual components separately if you prefer:
            </p>

            <div className="space-y-6">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Audio Captcha</h3>
                <div className="mb-2">
                  <code className="bg-gray-100 dark:bg-gray-900 p-1 rounded text-sm">
                    {`import { AudioCaptcha } from "mimicaptcha";`}
                  </code>
                </div>
                <div className="mt-4">
                  <AudioCaptcha onSuccess={() => alert("Audio success!")} />
                </div>
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Facial Captcha</h3>
                <div className="mb-2">
                  <code className="bg-gray-100 dark:bg-gray-900 p-1 rounded text-sm">
                    {`import { ExpressionSequence } from "mimicaptcha";`}
                  </code>
                </div>
                <div className="mt-4">
                  <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <ExpressionSequence
                      onSuccess={() => alert("Facial success!")}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>
          © {new Date().getFullYear()} MimicCaptcha. Privacy-first human
          verification.
        </p>
      </footer>
    </div>
  );
};

export default App;
