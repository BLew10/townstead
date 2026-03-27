import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: false }),
  UserButton: () => <div data-testid="user-button" />,
  SignInButton: ({ children }: any) => <div data-testid="sign-in-button">{children}</div>,
}));

vi.mock("convex/react", () => ({
  useQuery: () => ({ siteName: "Test Community" }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/test-org/events",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { PublicHeader } from "./public-header";

describe("PublicHeader", () => {
  it("renders without crashing", () => {
    render(<PublicHeader orgSlug="test-org" />);
    expect(screen.getByText("Test Community")).toBeDefined();
  });

  it("renders all navigation items", () => {
    render(<PublicHeader orgSlug="test-org" />);
    expect(screen.getAllByText("Events").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Directory").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Coupons").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Blog").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Videos").length).toBeGreaterThanOrEqual(1);
  });

  it("nav links point to org-prefixed routes", () => {
    render(<PublicHeader orgSlug="test-org" />);
    const eventLinks = screen.getAllByText("Events");
    const eventLink = eventLinks[0].closest("a");
    expect(eventLink?.getAttribute("href")).toBe("/test-org/events");
  });

  it("shows login button when not signed in", () => {
    render(<PublicHeader orgSlug="test-org" />);
    expect(screen.getByTestId("sign-in-button")).toBeDefined();
  });
});
