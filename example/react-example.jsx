import React, { useState } from "react";
import { MimiCaptcha, FacialCaptcha, AudioCaptcha } from "mimicaptcha";

// Example form component with captcha
function ExampleForm() {
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [mode, setMode] = useState("both"); // 'facial', 'audio', or 'both'
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!captchaVerified) {
      alert("Please complete the captcha verification");
      return;
    }

    // Process form submission
    console.log("Form submitted!", formData);
    alert("Form submitted successfully!");
  };

  const handleCaptchaSuccess = () => {
    setCaptchaVerified(true);
    console.log("Captcha verification successful!");
  };

  return (
    <div className="form-container">
      <h1>MimiCaptcha Example</h1>

      <div className="mode-selector">
        <h3>Captcha Mode</h3>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="mode-select"
        >
          <option value="both">Both (with tabs)</option>
          <option value="facial">Facial Verification Only</option>
          <option value="audio">Audio Verification Only</option>
        </select>
      </div>

      <form onSubmit={handleSubmit} className="example-form">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="captcha-container">
          <h3>Please verify you're human</h3>

          {mode === "both" && <MimiCaptcha onSuccess={handleCaptchaSuccess} />}

          {mode === "facial" && (
            <FacialCaptcha onSuccess={handleCaptchaSuccess} />
          )}

          {mode === "audio" && (
            <AudioCaptcha onSuccess={handleCaptchaSuccess} />
          )}
        </div>

        <div className="status-message">
          {captchaVerified ? (
            <div className="success-message">✓ Verification successful!</div>
          ) : (
            <div className="pending-message">Captcha verification required</div>
          )}
        </div>

        <button
          type="submit"
          className={`submit-button ${!captchaVerified ? "disabled" : ""}`}
          disabled={!captchaVerified}
        >
          Submit Form
        </button>
      </form>

      {/* Some basic styles - in a real application you would use a CSS file */}
      <style jsx>{`
        .form-container {
          font-family: -apple-system, system-ui, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        .mode-selector {
          margin-bottom: 20px;
        }

        .mode-select {
          padding: 8px;
          font-size: 16px;
          border-radius: 4px;
          border: 1px solid #ccc;
        }

        .example-form {
          padding: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 8px;
          font-size: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
        }

        .captcha-container {
          margin-top: 20px;
          margin-bottom: 20px;
        }

        .status-message {
          margin: 15px 0;
        }

        .success-message {
          color: #10b981;
          font-weight: 500;
        }

        .pending-message {
          color: #9ca3af;
        }

        .submit-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          padding: 10px 16px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
        }

        .submit-button:hover {
          background-color: #2563eb;
        }

        .submit-button.disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default ExampleForm;
