import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorDisplay } from "./error-display";

describe("ErrorDisplay", () => {
  it("renders the error message", () => {
    const error = new Error("Database connection failed");
    render(<ErrorDisplay error={error} reset={vi.fn()} />);
    expect(screen.getByText("Database connection failed")).toBeDefined();
  });

  it('renders the default heading "Something went wrong"', () => {
    const error = new Error("Oops");
    render(<ErrorDisplay error={error} reset={vi.fn()} />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it('renders "Try again" button', () => {
    const error = new Error("fail");
    render(<ErrorDisplay error={error} reset={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
  });

  it("falls back to default message when error.message is empty", () => {
    const error = new Error("");
    render(<ErrorDisplay error={error} reset={vi.fn()} />);
    expect(
      screen.getByText("An unexpected error occurred. Please try again.")
    ).toBeDefined();
  });
});
