import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import ExpressionSequence from "../facial-captcha";
import {
  setMockExpression,
  clearMockExpression,
  setMockConstantValues,
  clearMockConstantValues,
} from "../../../lib/mockFaceApi";

// Mock the face-api.js module
jest.mock("face-api.js", () => require("../../../lib/mockFaceApi").default);

describe("ExpressionSequence", () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearMockExpression();
    clearMockConstantValues();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders loading state initially", async () => {
    await act(async () => {
      render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    });
    expect(
      screen.getByText("Loading facial recognition models...")
    ).toBeInTheDocument();
  });

  it("shows start button after loading", async () => {
    await act(async () => {
      render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    });

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });
  });

  it("shows expression challenge after clicking start", async () => {
    await act(async () => {
      render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    });

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    fireEvent.click(
      screen.getByRole("button", { name: /start facial challenge/i })
    );

    // Wait for the first expression to appear
    await waitFor(() => {
      expect(screen.getByText(/expression 1 of 3/i)).toBeInTheDocument();
    });
  });

  it("completes challenge when correct expression is held", async () => {
    await act(async () => {
      render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    });

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    fireEvent.click(
      screen.getByRole("button", { name: /start facial challenge/i })
    );

    // Complete all three expressions in sequence
    for (let i = 0; i < 3; i++) {
      // Wait for the current expression to be shown
      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`expression ${i + 1} of 3`, "i"))
        ).toBeInTheDocument();
      });

      // Get the current target expression
      const targetExpression = screen
        .getByText(new RegExp(`expression ${i + 1} of 3`, "i"))
        .nextSibling?.textContent?.toLowerCase() as any;

      // Set the mock expression to match the target
      setMockExpression(targetExpression);

      // Simulate the interval running for 500ms (holdDuration)
      for (let j = 0; j < 5; j++) {
        await act(async () => {
          jest.advanceTimersByTime(100); // Advance by 100ms each time
          await Promise.resolve(); // Let React update
        });
      }

      // Wait for the next expression or success message
      await waitFor(() => {
        if (i < 2) {
          expect(
            screen.getByText(new RegExp(`expression ${i + 2} of 3`, "i"))
          ).toBeInTheDocument();
        } else {
          expect(
            screen.getByText("🎉 You completed the sequence!")
          ).toBeInTheDocument();
        }
      });
    }

    // Verify that onSuccess was called after completing all expressions
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it("allows skipping expressions", async () => {
    await act(async () => {
      render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    });

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    fireEvent.click(
      screen.getByRole("button", { name: /start facial challenge/i })
    );

    // Wait for the first expression
    await waitFor(() => {
      expect(screen.getByText(/expression 1 of 3/i)).toBeInTheDocument();
    });

    // Get initial expression
    const initialExpression = screen
      .getByText(/expression 1 of 3/i)
      .nextSibling?.textContent?.toLowerCase();

    // Find and click the skip button
    const skipButton = screen.getByRole("button", { name: /skip expression/i });
    fireEvent.click(skipButton);

    // Wait for the expression to change
    await waitFor(() => {
      const newExpression = screen
        .getByText(/expression 2 of 3/i)
        .nextSibling?.textContent?.toLowerCase();
      expect(newExpression).not.toBe(initialExpression);
    });
  });

  it("shows success message after completing all expressions", async () => {
    await act(async () => {
      render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    });

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    fireEvent.click(
      screen.getByRole("button", { name: /start facial challenge/i })
    );

    // Complete all expressions
    for (let i = 0; i < 3; i++) {
      // Wait for the current expression
      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`expression ${i + 1} of 3`, "i"))
        ).toBeInTheDocument();
      });

      const targetExpression = screen
        .getByText(new RegExp(`expression ${i + 1} of 3`, "i"))
        .nextSibling?.textContent?.toLowerCase() as any;

      setMockExpression(targetExpression);

      // Simulate the interval running for 500ms (holdDuration)
      for (let j = 0; j < 5; j++) {
        await act(async () => {
          jest.advanceTimersByTime(100); // Advance by 100ms each time
          await Promise.resolve(); // Let React update
        });
      }

      // Wait for the next expression or success message
      await waitFor(() => {
        if (i < 2) {
          expect(
            screen.getByText(new RegExp(`expression ${i + 2} of 3`, "i"))
          ).toBeInTheDocument();
        } else {
          expect(
            screen.getByText("🎉 You completed the sequence!")
          ).toBeInTheDocument();
        }
      });
    }
  });

  it("does not show success message after only 2 expressions", async () => {
    await act(async () => {
      render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    });

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    fireEvent.click(
      screen.getByRole("button", { name: /start facial challenge/i })
    );

    // Complete only two expressions
    for (let i = 0; i < 2; i++) {
      // Wait for the current expression
      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`expression ${i + 1} of 3`, "i"))
        ).toBeInTheDocument();
      });

      const targetExpression = screen
        .getByText(new RegExp(`expression ${i + 1} of 3`, "i"))
        .nextSibling?.textContent?.toLowerCase() as any;
      console.log("targetExpression", targetExpression);
      setMockExpression(targetExpression);

      // Simulate the interval running for 500ms (holdDuration)
      for (let j = 0; j < 5; j++) {
        await act(async () => {
          jest.advanceTimersByTime(100); // Advance by 100ms each time
          await Promise.resolve(); // Let React update
        });
      }

      // Wait for the next expression
      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`expression ${i + 2} of 3`, "i"))
        ).toBeInTheDocument();
      });
    }

    // Verify that success message is NOT shown
    expect(
      screen.queryByText("🎉 You completed the sequence!")
    ).not.toBeInTheDocument();
    // Verify that onSuccess was NOT called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("does not show success message after only 1 expression", async () => {
    await act(async () => {
      render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    });

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    fireEvent.click(
      screen.getByRole("button", { name: /start facial challenge/i })
    );

    // Wait for the first expression
    await waitFor(() => {
      expect(screen.getByText(/expression 1 of 3/i)).toBeInTheDocument();
    });

    const targetExpression = screen
      .getByText(/expression 1 of 3/i)
      .nextSibling?.textContent?.toLowerCase() as any;

    setMockExpression(targetExpression);

    // Simulate the interval running for 500ms (holdDuration)
    for (let j = 0; j < 5; j++) {
      await act(async () => {
        jest.advanceTimersByTime(100); // Advance by 100ms each time
        await Promise.resolve(); // Let React update
      });
    }

    // Wait for the next expression
    await waitFor(() => {
      expect(screen.getByText(/expression 2 of 3/i)).toBeInTheDocument();
    });

    // Verify that success message is NOT shown
    expect(
      screen.queryByText("🎉 You completed the sequence!")
    ).not.toBeInTheDocument();
    // Verify that onSuccess was NOT called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("allows skipping first two expressions and still verifies after completing all three", async () => {
    await act(async () => {
      render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    });

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    fireEvent.click(
      screen.getByRole("button", { name: /start facial challenge/i })
    );

    // Skip first two expressions
    for (let i = 0; i < 2; i++) {
      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`expression ${i + 1} of 3`, "i"))
        ).toBeInTheDocument();
      });

      const skipButton = screen.getByRole("button", {
        name: /skip expression/i,
      });
      fireEvent.click(skipButton);
    }

    // Complete the last expression
    await waitFor(() => {
      expect(screen.getByText(/expression 3 of 3/i)).toBeInTheDocument();
    });

    const targetExpression = screen
      .getByText(/expression 3 of 3/i)
      .nextSibling?.textContent?.toLowerCase() as any;

    setMockExpression(targetExpression);

    // Simulate the interval running for 500ms (holdDuration)
    for (let j = 0; j < 5; j++) {
      await act(async () => {
        jest.advanceTimersByTime(100); // Advance by 100ms each time
        await Promise.resolve(); // Let React update
      });
    }

    // Wait for success message
    await waitFor(() => {
      expect(
        screen.getByText("🎉 You completed the sequence!")
      ).toBeInTheDocument();
    });

    // Verify that onSuccess was called
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it("detects bot when expression values are constant", async () => {
    await act(async () => {
      render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    });

    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    fireEvent.click(
      screen.getByRole("button", { name: /start facial challenge/i })
    );

    // Set constant expression values to simulate a bot
    setMockConstantValues(true);

    // Wait for the first expression
    await waitFor(() => {
      expect(screen.getByText(/expression 1 of 3/i)).toBeInTheDocument();
    });

    const targetExpression = screen
      .getByText(/expression 1 of 3/i)
      .nextSibling?.textContent?.toLowerCase() as any;

    setMockExpression(targetExpression);

    // Simulate the interval running for 500ms (holdDuration)
    for (let j = 0; j < 5; j++) {
      await act(async () => {
        jest.advanceTimersByTime(100); // Advance by 100ms each time
        await Promise.resolve(); // Let React update
      });
    }

    // Verify that onSuccess was called with true (bot detected)
    expect(mockOnSuccess).toHaveBeenCalledWith(true);
  });

  it("triggers timeout after 30 seconds", async () => {
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    expect(
      screen.getByText("Loading facial recognition models...")
    ).toBeInTheDocument();
    // Wait for loading to complete and start button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start facial challenge/i })
      ).toBeInTheDocument();
    });

    // Click the start button
    fireEvent.click(
      screen.getByRole("button", { name: /start facial challenge/i })
    );

    // Wait for the first expression
    await waitFor(() => {
      expect(screen.getByText(/expression 1 of 3/i)).toBeInTheDocument();
    });

    // Advance time by 30 seconds
    await act(async () => {
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
    });

    // Verify that onSuccess was called with "timeout"
    expect(mockOnSuccess).toHaveBeenCalledWith("timeout");
  });
});
