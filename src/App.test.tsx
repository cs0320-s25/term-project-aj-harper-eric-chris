import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

jest.mock(
  "./components/audio-captcha/audio-captcha",
  () => ({
    AudioCaptcha: ({
      onSuccess,
    }: {
      onSuccess: (status: boolean | "timeout") => void;
    }) => (
      <div data-testid="mock-audio">
        <button onClick={() => onSuccess(false)}>Audio Success</button>
        <button onClick={() => onSuccess(true)}>Audio Suspicious</button>
        <button onClick={() => onSuccess("timeout")}>Audio Timeout</button>
      </div>
    ),
  })
);

jest.mock(
  "./components/facial-captcha/facial-captcha",
  () => ({
    ExpressionSequence: ({
      onSuccess,
    }: {
      onSuccess: (status: boolean | "timeout") => void;
    }) => (
      <div data-testid="mock-facial">
        <button onClick={() => onSuccess(false)}>Facial Success</button>
        <button onClick={() => onSuccess(true)}>Facial Suspicious</button>
        <button onClick={() => onSuccess("timeout")}>Facial Timeout</button>
      </div>
    ),
  })
);

describe("App integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Combined Setup: Audio flows (success, suspicious, timeout)", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /Original Implementation/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Audio Success")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Audio Success"));
    expect(screen.getByRole("heading", { name: /Verification Successful!/i })).toBeInTheDocument();

    fireEvent.click(screen.getByText("Try Again"));
    expect(screen.getByText("Audio Success")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Audio Suspicious"));
    expect(screen.getByRole("heading", { name: /Additional Verification Needed/i })).toBeInTheDocument();

    fireEvent.click(screen.getByText("Try Again"));
    expect(screen.getByText("Audio Success")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Audio Timeout"));
    expect(screen.getByRole("heading", { name: /Time's Up!/i })).toBeInTheDocument();
  });

  test("Combined Setup: switch to Facial and run flows", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Facial Mimicry/i }));
    expect(screen.getByText("Facial Success")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Facial Success"));
    expect(
      screen.getByRole("heading", { name: /Verification Successful!/i })
    ).toBeInTheDocument();
  });

  test("Individual Components tab shows both mocks", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Individual Components"));
    expect(screen.getByText("Audio Captcha")).toBeInTheDocument();
    expect(screen.getByText("Facial Captcha")).toBeInTheDocument();

    expect(screen.getByTestId("mock-audio")).toBeInTheDocument();
    expect(screen.getByTestId("mock-facial")).toBeInTheDocument();
  });

  test("Form Demo blocks submission until verification", () => {
    window.alert = jest.fn();
    render(<App />);
    fireEvent.click(screen.getByText("Form Demo"));
    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: "Alice" },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Message/i), {
      target: { value: "hello" },
    });

    const submitBtn = screen.getByRole("button", { name: /^Submit Form$/ });
+    expect(submitBtn).toBeDisabled();
+
+    fireEvent.click(screen.getByText("Audio Mimicry"));
+    fireEvent.click(screen.getByText("Audio Success"));

+    expect(submitBtn).toBeEnabled();
  });

  test("Form Demo: Audio verification then successful form submission", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Form Demo"));
    fireEvent.click(screen.getByText("Audio Mimicry"));
    expect(screen.getByTestId("mock-audio")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Audio Success"));
    expect(
      screen.getByRole("heading", { name: /Verification Successful!/i })
    ).toBeInTheDocument();

    // Fill and submit the form
    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "bob@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Message/i), {
      target: { value: "hi there" },
    });
    fireEvent.click(screen.getByText("Submit Form"));
    expect(
      screen.getByText("Form Submitted Successfully!")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Thank you for your submission, Bob!/i)
    ).toBeInTheDocument();
  });
});
