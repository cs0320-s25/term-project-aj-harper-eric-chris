/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        dark: {
          100: "#1e1e1e",
          200: "#2d2d2d",
          300: "#3a3a3a",
          400: "#4b4b4b",
          500: "#666666",
          600: "#808080",
          700: "#a3a3a3",
          800: "#d1d1d1",
          900: "#e5e7eb",
        },
        success: {
          light: "var(--success-bg)",
          DEFAULT: "var(--success-text)",
          dark: "#022c22",
        },
        error: {
          light: "var(--error-bg)",
          DEFAULT: "var(--error-text)",
          dark: "#2c0b0e",
        },
        warning: {
          light: "var(--warning-bg)",
          DEFAULT: "var(--warning-text)",
          dark: "#27190e",
        },
        info: {
          light: "var(--info-bg)",
          DEFAULT: "var(--info-text)",
          dark: "#0c2536",
        },
      },
      backgroundColor: {
        card: "var(--card-bg)",
        input: "var(--input-bg)",
        button: "var(--button-bg)",
      },
      borderColor: {
        card: "var(--card-border)",
        input: "var(--input-border)",
      },
      textColor: {
        body: "var(--foreground)",
      },
      boxShadow: {
        card: "0 4px 6px var(--shadow-color)",
        "card-lg": "0 10px 15px -3px var(--shadow-color)",
      },
    },
  },
  plugins: [],
};
