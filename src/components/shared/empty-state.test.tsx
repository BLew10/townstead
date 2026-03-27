import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No contacts" />);
    expect(screen.getByText("No contacts")).toBeDefined();
  });

  it("renders title and description", () => {
    render(
      <EmptyState title="No contacts" description="Add your first contact." />
    );
    expect(screen.getByText("No contacts")).toBeDefined();
    expect(screen.getByText("Add your first contact.")).toBeDefined();
  });

  it("renders action button when provided", () => {
    render(
      <EmptyState
        title="No contacts"
        action={<button>Add Contact</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Add Contact" })).toBeDefined();
  });

  it("does not render description when omitted", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText("Add your first contact.")).toBeNull();
  });
});
