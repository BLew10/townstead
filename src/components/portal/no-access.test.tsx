import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortalNoAccess } from "./no-access";

describe("PortalNoAccess", () => {
  it("renders without crashing", () => {
    render(<PortalNoAccess />);
    expect(screen.getByText("Access Restricted")).toBeDefined();
  });

  it("displays the contact admin message", () => {
    render(<PortalNoAccess />);
    expect(
      screen.getByText(/Contact your account administrator/)
    ).toBeDefined();
  });
});
