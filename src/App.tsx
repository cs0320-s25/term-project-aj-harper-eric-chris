import React, { useEffect, useState } from "react";
import { ExpressionSequence } from "./components/facial-captcha/facial-captcha";
import { AudioCaptcha } from "./components/audio-captcha/audio-captcha";
import { ErrorBoundary } from "react-error-boundary";
enum CaptchaType {
  AUDIO = "audio",
  FACIAL = "facial",
  NONE = "none",
}
/**
 * Main App component that replaces the Next.js page structure
 * This still allows you to use the original components with the new setup
 */
const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [tabView, setTabView] = useState<
    "original" | "individual" | "form-demo"
  >("original");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [selectedCaptchaType, setSelectedCaptchaType] = useState<
    "audio" | "facial"
  >("audio");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Form demo state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [formCaptchaType, setFormCaptchaType] = useState<CaptchaType>(
    CaptchaType.NONE
  );
  const [formCaptchaVerified, setFormCaptchaVerified] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "success" | "error" | "timeout" | "suspicious" | "failure"
  >("idle");

  const handleCaptchaSuccess = (status: boolean | "timeout" | "failure") => {
    if (status === "timeout") {
      console.log("CAPTCHA timed out!");
      setCaptchaVerified(false);
      setSubmissionStatus("timeout");
    } else if (status === true) {
      console.log("Bot detected!");
      setCaptchaVerified(false);
      setSubmissionStatus("suspicious");
    } else if (status === false) {
      console.log("CAPTCHA verified successfully!");
      setCaptchaVerified(true);
      setSubmissionStatus("success");
    } else {
      console.log("CAPTCHA failed!");
      setCaptchaVerified(false);
      setSubmissionStatus("failure");
    }
  };

  // Form demo handlers
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCaptchaVerified) {
      alert("Please complete the CAPTCHA verification first");
      return;
    }

    // Simulate form submission
    setSubmissionStatus("success");
    setShowForm(false);
  };

  const handleFormCaptchaSuccess = () => {
    setFormCaptchaVerified(true);
  };

  const resetFormCaptcha = () => {
    setFormCaptchaVerified(false);
    setFormCaptchaType(CaptchaType.NONE);
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-dark-100 dark:to-dark-200 text-gray-900 dark:text-dark-900">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 text-primary-600 dark:text-primary-400">
          MimicCaptcha
        </h1>
        <p className="text-gray-600 dark:text-dark-700 max-w-md">
          A multi-modal CAPTCHA system based on human mimicry capabilities
        </p>
      </header>
      <button
        onClick={() => setDarkMode((v) => !v)}
        className="absolute top-4 right-4 p-2 rounded-full transition-colors bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-300 shadow-card"
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-yellow-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>

      {/* Tab selection */}
      <div className="mb-8 bg-card dark:bg-dark-100 rounded-lg shadow-card border border-card-border dark:border-dark-400 p-4 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setTabView("original")}
          className={`py-2 px-4 rounded-md transition-colors
            ${
              tabView === "original"
                ? "bg-primary-600 text-white"
                : "bg-white hover:bg-gray-100 dark:bg-dark-300 dark:hover:bg-dark-400 text-gray-800 dark:text-dark-900 border border-gray-200 dark:border-dark-500"
            }`}
        >
          Combined Setup
        </button>
        <button
          onClick={() => setTabView("individual")}
          className={`py-2 px-4 rounded-md transition-colors
            ${
              tabView === "individual"
                ? "bg-primary-600 text-white"
                : "bg-white hover:bg-gray-100 dark:bg-dark-300 dark:hover:bg-dark-400 text-gray-800 dark:text-dark-900 border border-gray-200 dark:border-dark-500"
            }`}
        >
          Individual Components
        </button>
        <button
          onClick={() => setTabView("form-demo")}
          className={`py-2 px-4 rounded-md transition-colors
            ${
              tabView === "form-demo"
                ? "bg-primary-600 text-white"
                : "bg-white hover:bg-gray-100 dark:bg-dark-300 dark:hover:bg-dark-400 text-gray-800 dark:text-dark-900 border border-gray-200 dark:border-dark-500"
            }`}
        >
          Form Demo
        </button>
      </div>

      <main className="w-full max-w-4xl">
        {tabView === "original" && (
          <div className="bg-card dark:bg-dark-100 rounded-lg shadow-card border border-card-border dark:border-dark-400 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-dark-900">
              Original Implementation
            </h2>
            <p className="text-gray-600 dark:text-dark-700 mb-4">
              This shows how the components work together like in the original
              app:
            </p>

            {captchaVerified ? (
              <div className="bg-card dark:bg-dark-100 rounded-lg p-8 text-center border border-card-border dark:border-dark-400">
                <div className="text-success mb-4">
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
                <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-dark-900">
                  Verification Successful!
                </h2>
                <p className="text-gray-600 dark:text-dark-700 mb-4">
                  You have successfully verified that you are human.
                </p>
                <button
                  onClick={() => {
                    setCaptchaVerified(false);
                    setSubmissionStatus("idle");
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : submissionStatus === "timeout" ? (
              <div className="bg-card dark:bg-dark-100 rounded-lg p-8 text-center border border-card-border dark:border-dark-400">
                <div className="text-warning mb-4">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-dark-900">
                  Time's Up!
                </h2>
                <p className="text-gray-600 dark:text-dark-700 mb-4">
                  The verification challenge has timed out. Please try again
                  with a fresh attempt.
                </p>
                <button
                  onClick={() => {
                    setCaptchaVerified(false);
                    setSubmissionStatus("idle");
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : submissionStatus === "suspicious" ? (
              <div className="bg-card dark:bg-dark-100 rounded-lg p-8 text-center border border-card-border dark:border-dark-400">
                <div className="text-info mb-4">
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-dark-900">
                  Additional Verification Needed
                </h2>
                <p className="text-gray-600 dark:text-dark-700 mb-4">
                  We couldn't verify your response. This might happen if your
                  camera is lagging, your connection is unstable, or if the
                  lighting is poor. Please try again with a stable connection
                  and good lighting.
                </p>
                <button
                  onClick={() => {
                    setCaptchaVerified(false);
                    setSubmissionStatus("idle");
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : submissionStatus === "failure" ? (
              <div
                className="bg-error-light dark:bg-error-dark p-4 rounded-md text-center"
                aria-live="assertive"
              >
                <div className="text-error mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2 text-error dark:text-error">
                  Verification Failed
                </h3>
                <p className="text-sm text-error dark:text-error mb-4">
                  We couldn't match your tone with the expected frequency.
                </p>
                <button
                  onClick={() => {
                    setCaptchaVerified(false);
                    setSubmissionStatus("idle");
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-dark-300 dark:hover:bg-dark-400 text-gray-800 dark:text-dark-900 rounded-md transition-colors"
                  aria-label="Try the audio challenge again"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div>
                <div className="tabs flex mb-4">
                  <button
                    onClick={() => setSelectedCaptchaType("audio")}
                    className={`flex-1 py-2 px-4 rounded-tl-md rounded-bl-md border-r ${
                      selectedCaptchaType === "audio"
                        ? "bg-primary-600 text-white"
                        : "bg-white dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-400 text-gray-800 dark:text-dark-900"
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
                    className={`flex-1 py-2 px-4 rounded-tr-md rounded-br-md ${
                      selectedCaptchaType === "facial"
                        ? "bg-primary-600 text-white"
                        : "bg-white dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-400 text-gray-800 dark:text-dark-900"
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

                <div className="captcha-container bg-card dark:bg-dark-100 p-4 rounded-md border border-card-border dark:border-dark-400">
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
          <div className="bg-card dark:bg-dark-100 rounded-lg shadow-card border border-card-border dark:border-dark-400 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-dark-900">
              Individual Components
            </h2>
            <p className="text-gray-600 dark:text-dark-700 mb-6">
              Access the individual components separately if you prefer:
            </p>

            <div className="space-y-6">
              <div className="p-4 border border-card-border dark:border-dark-400 rounded-lg bg-gray-50 dark:bg-dark-200">
                <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-dark-900">
                  Audio Captcha
                </h3>
                <div className="mb-2">
                  <code className="bg-white dark:bg-dark-300 p-1 rounded text-sm text-gray-800 dark:text-dark-900 border border-gray-200 dark:border-dark-500">
                    {`import { AudioCaptcha } from "mimicaptcha";`}
                  </code>
                </div>
                <div className="mt-4">
                  <AudioCaptcha onSuccess={handleCaptchaSuccess} />
                </div>
              </div>

              <div className="p-4 border border-card-border dark:border-dark-400 rounded-lg bg-gray-50 dark:bg-dark-200">
                <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-dark-900">
                  Facial Captcha
                </h3>
                <div className="mb-2">
                  <code className="bg-white dark:bg-dark-300 p-1 rounded text-sm text-gray-800 dark:text-dark-900 border border-gray-200 dark:border-dark-500">
                    {`import { ExpressionSequence } from "mimicaptcha";`}
                  </code>
                </div>
                <div className="mt-4">
                  <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <ExpressionSequence onSuccess={handleCaptchaSuccess} />
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </div>
        )}

        {tabView === "form-demo" && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-900">
                Contact Form Demo
              </h2>
              <p className="text-gray-600 dark:text-dark-700 mt-2">
                See different CAPTCHA options in action
              </p>
            </div>

            {showForm ? (
              <div className="bg-card dark:bg-dark-100 rounded-lg shadow-card border border-card-border dark:border-dark-400 p-8">
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  {/* Form fields */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-input dark:border-dark-400 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-dark-900 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-input dark:border-dark-400 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-dark-900 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-700 dark:text-dark-900 mb-1"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-input dark:border-dark-400 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-dark-900 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      required
                    />
                  </div>

                  {/* CAPTCHA section */}
                  <div className="border-t border-gray-200 dark:border-dark-400 pt-6">
                    <div className="flex flex-col items-center bg-gray-50 dark:bg-dark-200 p-6 rounded-lg border border-card-border dark:border-dark-400 shadow-sm">
                      <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-primary-500 dark:text-primary-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>

                      <h2 className="text-xl font-medium mb-2 text-center text-gray-800 dark:text-dark-900">
                        Verify you're human
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-dark-700 mb-4 text-center">
                        Complete the mimicry challenge to continue
                      </p>

                      {formCaptchaVerified ? (
                        <div className="text-center py-4 w-full">
                          <div className="text-5xl mb-4" aria-hidden="true">
                            ✅
                          </div>
                          <h3 className="text-xl font-medium text-success dark:text-success mb-2">
                            Verification Successful!
                          </h3>
                          <p className="text-gray-600 dark:text-dark-700 mb-4">
                            You've been verified as human.
                          </p>
                          <button
                            type="button"
                            onClick={resetFormCaptcha}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-dark-300 dark:hover:bg-dark-400 rounded-md text-gray-800 dark:text-dark-900 transition-colors"
                          >
                            Reset Verification
                          </button>
                        </div>
                      ) : (
                        <div className="w-full">
                          {formCaptchaType === CaptchaType.NONE && (
                            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 justify-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormCaptchaType(CaptchaType.AUDIO)
                                }
                                className="flex items-center justify-center space-x-2 bg-white hover:bg-gray-100 dark:bg-dark-300 dark:hover:bg-dark-400 text-gray-800 dark:text-dark-900 py-3 px-6 rounded-md transition-colors border border-gray-200 dark:border-dark-500 shadow-sm"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5 text-primary-500 dark:text-primary-400"
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
                                <span>Audio Mimicry</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setFormCaptchaType(CaptchaType.FACIAL)
                                }
                                className="flex items-center justify-center space-x-2 bg-white hover:bg-gray-100 dark:bg-dark-300 dark:hover:bg-dark-400 text-gray-800 dark:text-dark-900 py-3 px-6 rounded-md transition-colors border border-gray-200 dark:border-dark-500 shadow-sm"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5 text-primary-500 dark:text-primary-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                <span>Facial Mimicry</span>
                              </button>
                            </div>
                          )}

                          {formCaptchaType === CaptchaType.AUDIO && (
                            <div className="mt-4">
                              <AudioCaptcha
                                onSuccess={handleFormCaptchaSuccess}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setFormCaptchaType(CaptchaType.NONE)
                                }
                                className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-dark-300 dark:hover:bg-dark-400 rounded-md text-gray-800 dark:text-dark-900 transition-colors"
                              >
                                Back to Options
                              </button>
                            </div>
                          )}

                          {formCaptchaType === CaptchaType.FACIAL && (
                            <div className="mt-4">
                              <ErrorBoundary FallbackComponent={ErrorFallback}>
                                <ExpressionSequence
                                  onSuccess={handleFormCaptchaSuccess}
                                />
                              </ErrorBoundary>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormCaptchaType(CaptchaType.NONE)
                                }
                                className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-dark-300 dark:hover:bg-dark-400 rounded-md text-gray-800 dark:text-dark-900 transition-colors"
                              >
                                Back to Options
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      type="submit"
                      disabled={!formCaptchaVerified}
                      className={`px-6 py-3 rounded-md transition-colors ${
                        formCaptchaVerified
                          ? "bg-success hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800"
                          : "bg-gray-300 dark:bg-dark-400 text-gray-500 dark:text-dark-600 cursor-not-allowed"
                      }`}
                    >
                      Submit Form
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-card dark:bg-dark-100 rounded-lg shadow-card border border-card-border dark:border-dark-400 p-8 text-center">
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-2xl font-bold text-success mb-2">
                  Form Submitted Successfully!
                </h2>
                <p className="text-gray-600 dark:text-dark-700 mb-6">
                  Thank you for your submission, {name}! We'll get back to you
                  soon.
                </p>
                <button
                  onClick={() => {
                    setShowForm(true);
                    setSubmissionStatus("idle");
                    setFormCaptchaVerified(false);
                    setFormCaptchaType(CaptchaType.NONE);
                    setName("");
                    setEmail("");
                    setMessage("");
                  }}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                >
                  Start Over
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-12 text-center text-gray-500 dark:text-dark-600 text-sm">
        <p>
          © {new Date().getFullYear()} MimicCaptcha. Privacy-first human
          verification.
        </p>
      </footer>
    </div>
  );
};

export default App;
