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
} from "../../../lib/mockFaceApi";

// Mock the face-api.js module
jest.mock("face-api.js", () => require("../../../lib/mockFaceApi").default);

describe("ExpressionSequence", () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearMockExpression();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders loading state initially", () => {
    render(<ExpressionSequence onSuccess={mockOnSuccess} />);
    expect(screen.getByText("Loading models...")).toBeInTheDocument();
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
      const expressionCounter = screen.getByText(/Expression/i, {
        selector: 'p[style*="font-size: 20px"]',
      });
      expect(expressionCounter).toHaveTextContent(`${i + 1} of 3`);

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
          // For first two expressions, we should see the next expression
          expect(
            screen.getByText(/Match this expression:/i)
          ).toBeInTheDocument();
          // Verify expression number has incremented
          const nextExpressionCounter = screen.getByText(/Expression/i, {
            selector: 'p[style*="font-size: 20px"]',
          });
          expect(nextExpressionCounter).toHaveTextContent(`${i + 2} of 3`);
        } else {
          // For the last expression, we should see success
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

    // Find and click the skip button
    const skipButton = screen.getByText(/Skip/i);
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
      const expressionCounter = screen.getByText(/Expression/i, {
        selector: 'p[style*="font-size: 20px"]',
      });
      expect(expressionCounter).toHaveTextContent(`${i + 1} of 3`);

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
          const nextExpressionCounter = screen.getByText(/Expression/i, {
            selector: 'p[style*="font-size: 20px"]',
          });
          expect(nextExpressionCounter).toHaveTextContent(`${i + 2} of 3`);
        } else {
          expect(
            screen.getByText("🎉 You completed the sequence!")
          ).toBeInTheDocument();
        }
      });
    }
  });
});
