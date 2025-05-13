import React, { useState } from "react";
import ExpressionSequence from "./components/facial-captcha/facial-captcha";
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
  const [tabView, setTabView] = useState<
    "original" | "individual" | "form-demo"
  >("original");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [selectedCaptchaType, setSelectedCaptchaType] = useState<
    "audio" | "facial"
  >("audio");

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
    "idle" | "success" | "error"
  >("idle");

  const handleCaptchaSuccess = (status: boolean | "timeout") => {
    if (status === "timeout") {
      console.log("CAPTCHA timed out!");
      setCaptchaVerified(false);
    } else if (status === true) {
      console.log("Bot detected!");
      setCaptchaVerified(false);
    } else {
      console.log("CAPTCHA verified successfully!");
      setCaptchaVerified(true);
    }
  };

  // Form demo handlers
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCaptchaVerified) {
      setSubmissionStatus("error");
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
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setTabView("original")}
          className={`py-2 px-4 rounded ${
            tabView === "original"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Combined Setup
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
        <button
          onClick={() => setTabView("form-demo")}
          className={`py-2 px-4 rounded ${
            tabView === "form-demo"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Form Demo
        </button>
      </div>

      <main className="w-full max-w-4xl">
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
                  <AudioCaptcha onSuccess={() => setCaptchaVerified(true)} />
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
              <h2 className="text-2xl font-bold">Contact Form Demo</h2>
              <p className="text-gray-600 mt-2">
                See different CAPTCHA options in action
              </p>
            </div>

            {showForm ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  {/* Form fields */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* CAPTCHA section */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-blue-500"
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

                      <h2 className="text-xl font-medium mb-2 text-center">
                        Verify you're human
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
                        Complete the mimicry challenge to continue
                      </p>

                      {formCaptchaVerified ? (
                        <div className="text-center py-4 w-full">
                          <div className="text-5xl mb-4" aria-hidden="true">
                            ✅
                          </div>
                          <h3 className="text-xl font-medium text-green-600 mb-2">
                            Verification Successful!
                          </h3>
                          <p className="text-gray-600 mb-4">
                            You've been verified as human.
                          </p>
                          <button
                            type="button"
                            onClick={resetFormCaptcha}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 transition-colors"
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
                                className="flex items-center justify-center space-x-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-md transition-colors"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
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
                                className="flex items-center justify-center space-x-2 bg-gray-200 hover:bg-gray-300 text-black py-3 px-6 rounded-md transition-colors"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
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
                                className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 transition-colors"
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
                                className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 transition-colors"
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
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      Submit Form
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">
                  Form Submitted Successfully!
                </h2>
                <p className="text-gray-600 mb-6">
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
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  Start Over
                </button>
              </div>
            )}
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
