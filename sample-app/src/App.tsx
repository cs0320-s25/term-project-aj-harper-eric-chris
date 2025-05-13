import { useState } from "react";
import { AudioCaptcha, ExpressionSequence } from "mimicaptcha";
import { ErrorBoundary } from "react-error-boundary";

// Simplified versions of the UI components
const TabsList = ({ children }: { children: React.ReactNode }) => (
  <div className="grid w-full grid-cols-2 mb-4 overflow-hidden rounded-lg border border-gray-200">
    {children}
  </div>
);

const TabsTrigger = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    className={`flex items-center justify-center p-3 text-sm font-medium ${
      active
        ? "bg-white border-b-2 border-blue-500 text-blue-600"
        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
    }`}
    onClick={onClick}
  >
    {children}
  </button>
);

const TabsContent = ({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) => (
  <div className={`space-y-4 mt-4 ${active ? "block" : "hidden"}`}>
    {children}
  </div>
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
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg">
      <h2 className="text-lg font-bold text-red-600 mb-2">
        Something went wrong:
      </h2>
      <pre className="text-sm text-red-500 bg-red-100 p-4 rounded mb-4 overflow-auto max-w-full">
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

function App() {
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<"audio" | "facial">("audio");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCaptchaSuccess = () => {
    console.log("CAPTCHA verified successfully!");
    setCaptchaVerified(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaVerified) {
      setSubmitStatus("Please complete the CAPTCHA verification");
      return;
    }

    // Simulate form submission
    setSubmitStatus("Processing...");

    setTimeout(() => {
      console.log("Form submitted:", formData);
      setSubmitStatus("Form submitted successfully!");

      // Reset form
      setFormData({
        name: "",
        email: "",
        message: "",
      });
      setCaptchaVerified(false);
    }, 1500);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      message: "",
    });
    setCaptchaVerified(false);
    setSubmitStatus(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 text-primary-600 dark:text-primary-400">
          Contact Form with MimicCaptcha
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-md">
          A sample form demonstrating MimicCaptcha integration
        </p>
      </header>

      <main className="w-full max-w-md">
        {submitStatus === "Form submitted successfully!" ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
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
            <h2 className="text-2xl font-bold mb-2">Success!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your message has been submitted successfully.
            </p>
            <button
              onClick={resetForm}
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                ></textarea>
              </div>

              <div className="pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verify you're human
                </p>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <TabsList>
                    <TabsTrigger
                      active={activeTab === "audio"}
                      onClick={() => setActiveTab("audio")}
                    >
                      <span className="flex items-center">
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
                    </TabsTrigger>
                    <TabsTrigger
                      active={activeTab === "facial"}
                      onClick={() => setActiveTab("facial")}
                    >
                      <span className="flex items-center">
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
                    </TabsTrigger>
                  </TabsList>

                  <div className="p-4">
                    <TabsContent active={activeTab === "audio"}>
                      <div className="mb-4 overflow-hidden rounded-lg aspect-[2/1] bg-gray-900 relative">
                        <AudioCaptcha onSuccess={handleCaptchaSuccess} />
                      </div>
                    </TabsContent>

                    <TabsContent active={activeTab === "facial"}>
                      <ErrorBoundary FallbackComponent={ErrorFallback}>
                        <div
                          className="overflow-hidden rounded-lg bg-gray-900"
                          style={{ minHeight: "400px" }}
                        >
                          <ExpressionSequence
                            onSuccess={handleCaptchaSuccess}
                          />
                        </div>
                      </ErrorBoundary>
                    </TabsContent>
                  </div>
                </div>
              </div>

              {submitStatus && submitStatus !== "Processing..." && (
                <div
                  className={`p-3 rounded-md ${
                    submitStatus === "Please complete the CAPTCHA verification"
                      ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                      : "bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
                  }`}
                >
                  {submitStatus}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className={`w-full py-2 px-4 rounded-md transition-colors ${
                    submitStatus === "Processing..."
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-primary-500 hover:bg-primary-600 text-white"
                  }`}
                  disabled={submitStatus === "Processing..."}
                >
                  {submitStatus === "Processing..."
                    ? "Submitting..."
                    : "Submit"}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      <footer className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>
          © {new Date().getFullYear()} MimicCaptcha Sample. Privacy-first human
          verification.
        </p>
      </footer>
    </div>
  );
}

export default App;
