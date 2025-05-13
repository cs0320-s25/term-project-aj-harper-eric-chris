import * as React from "react";
import FacialCaptcha from "../../components/facial-captcha/facial-captcha";
import AudioCaptcha from "../../components/audio-captcha/audio-captcha";
import "./mimicaptcha.css";

export { FacialCaptcha, AudioCaptcha };

// Combined component that offers both options
export interface MimiCaptchaProps {
  onSuccess: () => void;
  mode?: "facial" | "audio" | "both";
  defaultMode?: "facial" | "audio";
}

// Isolated styles to ensure they're applied regardless of the host application
const styles = {
  container: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
    maxWidth: "500px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  tabs: {
    display: "flex",
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f3f4f6",
  },
  tab: {
    flex: 1,
    padding: "12px 16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    color: "#6b7280",
    transition: "all 0.2s ease",
  },
  activeTab: {
    backgroundColor: "#fff",
    color: "#1f2937",
    borderBottom: "2px solid #3b82f6",
  },
  content: {
    padding: "16px",
  },
};

const MimiCaptcha: React.FC<MimiCaptchaProps> = ({
  onSuccess,
  mode = "both",
  defaultMode = "facial",
}) => {
  const [activeMode, setActiveMode] = React.useState<"facial" | "audio">(
    defaultMode
  );

  if (mode === "facial") {
    return <FacialCaptcha onSuccess={onSuccess} />;
  }

  if (mode === "audio") {
    return <AudioCaptcha onSuccess={onSuccess} />;
  }

  // Both modes - show tabs to switch between them
  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeMode === "facial" ? styles.activeTab : {}),
          }}
          onClick={() => setActiveMode("facial")}
        >
          Facial Verification
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeMode === "audio" ? styles.activeTab : {}),
          }}
          onClick={() => setActiveMode("audio")}
        >
          Audio Verification
        </button>
      </div>

      <div style={styles.content}>
        {activeMode === "facial" ? (
          <FacialCaptcha onSuccess={onSuccess} />
        ) : (
          <AudioCaptcha onSuccess={onSuccess} />
        )}
      </div>
    </div>
  );
};

export default MimiCaptcha;
