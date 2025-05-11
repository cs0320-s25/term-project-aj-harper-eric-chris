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

  it("renders loading state initially", () => {
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    expect(
      screen.getByText("Loading facial recognition models...")
    ).toBeInTheDocument();
  });

  it("shows expression challenge after loading", async () => {
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete and state updates
    await waitFor(() => {
      expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
    });
  });

  it("completes challenge when correct expression is held", async () => {
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
    });

    // Complete all three expressions in sequence
    for (let i = 0; i < 3; i++) {
      // Verify current expression number
      expect(
        screen.getByRole("status", {
          name: new RegExp(`expression ${i + 1} of 3`, "i"),
        })
      ).toBeInTheDocument();

      // Get the current target expression
      const targetExpression = screen
        .getByText(/Match this expression:/i)
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
            screen.getByText(/Match this expression:/i)
          ).toBeInTheDocument();
          // Verify expression number has incremented
          expect(
            screen.getByRole("status", {
              name: new RegExp(`expression ${i + 2} of 3`, "i"),
            })
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
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
    });

    // Get initial expression
    const initialExpression = screen
      .getByText(/Match this expression:/i)
      .nextSibling?.textContent?.toLowerCase();

    // Find and click the skip button using aria-label
    const skipButton = screen.getByRole("button", { name: /skip expression/i });
    fireEvent.click(skipButton);

    // Wait for the expression to change
    await waitFor(() => {
      const newExpression = screen
        .getByText(/Match this expression:/i)
        .nextSibling?.textContent?.toLowerCase();
      expect(newExpression).not.toBe(initialExpression);
    });
  });

  it("shows success message after completing all expressions", async () => {
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
    });

    // Complete all expressions
    for (let i = 0; i < 3; i++) {
      // Verify current expression number
      expect(
        screen.getByRole("status", {
          name: new RegExp(`expression ${i + 1} of 3`, "i"),
        })
      ).toBeInTheDocument();

      const targetExpression = screen
        .getByText(/Match this expression:/i)
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
            screen.getByText(/Match this expression:/i)
          ).toBeInTheDocument();
          // Verify expression number has incremented
          expect(
            screen.getByRole("status", {
              name: new RegExp(`expression ${i + 2} of 3`, "i"),
            })
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
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
    });

    // Complete only two expressions
    for (let i = 0; i < 2; i++) {
      // Verify current expression number
      expect(
        screen.getByRole("status", {
          name: new RegExp(`expression ${i + 1} of 3`, "i"),
        })
      ).toBeInTheDocument();

      const targetExpression = screen
        .getByText(/Match this expression:/i)
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
        expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
        // Verify expression number has incremented
        expect(
          screen.getByRole("status", {
            name: new RegExp(`expression ${i + 2} of 3`, "i"),
          })
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
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
    });

    // Complete only one expression
    // Verify current expression number
    expect(
      screen.getByRole("status", { name: /expression 1 of 3/i })
    ).toBeInTheDocument();

    const targetExpression = screen
      .getByText(/Match this expression:/i)
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
      expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
      // Verify expression number has incremented
      expect(
        screen.getByRole("status", { name: /expression 2 of 3/i })
      ).toBeInTheDocument();
    });

    // Verify that success message is NOT shown
    expect(
      screen.queryByText("🎉 You completed the sequence!")
    ).not.toBeInTheDocument();
    // Verify that onSuccess was NOT called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("allows skipping first two expressions and still verifies after completing all three", async () => {
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
    });

    // Skip first two expressions
    for (let i = 0; i < 2; i++) {
      // Verify current expression number stays at 1 of 3
      expect(
        screen.getByRole("status", { name: /expression 1 of 3/i })
      ).toBeInTheDocument();

      // Find and click the skip button using aria-label
      const skipButton = screen.getByRole("button", {
        name: /skip expression/i,
      });
      fireEvent.click(skipButton);

      // Wait for the next expression
      await waitFor(() => {
        expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
        // Verify expression number still shows 1 of 3
        expect(
          screen.getByRole("status", { name: /expression 1 of 3/i })
        ).toBeInTheDocument();
      });
    }

    // Complete all three expressions
    for (let i = 0; i < 3; i++) {
      // Verify current expression number
      expect(
        screen.getByRole("status", {
          name: new RegExp(`expression ${i + 1} of 3`, "i"),
        })
      ).toBeInTheDocument();

      const targetExpression = screen
        .getByText(/Match this expression:/i)
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
            screen.getByText(/Match this expression:/i)
          ).toBeInTheDocument();
          // Verify expression number has incremented
          expect(
            screen.getByRole("status", {
              name: new RegExp(`expression ${i + 2} of 3`, "i"),
            })
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

  it("detects bot when expression values are constant", async () => {
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
    });

    // Get the current target expression
    const targetExpression = screen
      .getByText(/Match this expression:/i)
      .nextSibling?.textContent?.toLowerCase() as any;

    // Set constant values for bot detection
    setMockConstantValues(true);
    setMockExpression(targetExpression);

    // Simulate the interval running for 500ms (holdDuration) with constant values
    for (let j = 0; j < 5; j++) {
      await act(async () => {
        jest.advanceTimersByTime(100); // Advance by 100ms each time
        await Promise.resolve(); // Let React update
      });
    }

    // Wait for onSuccess to be called with bot detection
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(true); // true indicates bot detected
    });

    // Clean up
    clearMockConstantValues();
  });

  it("triggers timeout after 30 seconds", async () => {
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
    });

    // Fast forward 30 seconds
    await act(async () => {
      jest.advanceTimersByTime(30000);
      await Promise.resolve(); // Let React update
    });

    // Check that onSuccess was called with timeout
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith("timeout");
    });
  });

  it("clears timeout after successful completion", async () => {
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Match this expression:/i)).toBeInTheDocument();
    });

    // Complete all expressions
    for (let i = 0; i < 3; i++) {
      const targetExpression = screen
        .getByText(/Match this expression:/i)
        .nextSibling?.textContent?.toLowerCase() as any;

      setMockExpression(targetExpression);

      // Simulate the interval running for 500ms (holdDuration)
      for (let j = 0; j < 5; j++) {
        await act(async () => {
          jest.advanceTimersByTime(100);
          await Promise.resolve();
        });
      }
    }

    // Verify success
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(false);
    });

    // Fast forward past the timeout
    await act(async () => {
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
    });

    // Verify that onSuccess was not called again
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
  });
});
