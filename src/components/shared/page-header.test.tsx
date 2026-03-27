import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders title", () => {
    render(<PageHeader title="Contacts" />);
    expect(
      screen.getByRole("heading", { name: "Contacts", level: 1 })
    ).toBeDefined();
  });

  it("renders description when provided", () => {
    render(
      <PageHeader title="Contacts" description="Manage your contact list." />
    );
    expect(screen.getByText("Manage your contact list.")).toBeDefined();
  });

  it("does not render description when omitted", () => {
    render(<PageHeader title="Contacts" />);
    expect(screen.queryByText("Manage your contact list.")).toBeNull();
  });

  it("renders actions", () => {
    render(
      <PageHeader
        title="Contacts"
        actions={<button>Add Contact</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Add Contact" })).toBeDefined();
  });
});
