import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfirmDialog } from "./confirm-dialog";

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  title: "Delete Item",
  description: "This action cannot be undone.",
  onConfirm: vi.fn(),
};

describe("ConfirmDialog", () => {
  it("renders title and description", () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByText("Delete Item")).toBeDefined();
    expect(screen.getByText("This action cannot be undone.")).toBeDefined();
  });

  it("shows custom confirmLabel", () => {
    render(<ConfirmDialog {...baseProps} confirmLabel="Delete Forever" />);
    expect(screen.getByText("Delete Forever")).toBeDefined();
  });

  it('shows "Processing..." when loading is true', () => {
    render(<ConfirmDialog {...baseProps} loading={true} />);
    expect(screen.getByText("Processing...")).toBeDefined();
  });

  it("applies destructive variant class to confirm button", () => {
    render(<ConfirmDialog {...baseProps} variant="destructive" />);
    const btn = screen.getByRole("button", { name: "Confirm" });
    expect(btn.className).toContain("destructive");
  });
});
