import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const DEFAULT_BRANDING = {
  siteName: "Test Community",
  footerText: "Your local community calendar",
  socialLinks: {
    facebook: "https://facebook.com/test",
    instagram: "https://instagram.com/test",
    twitter: "",
    youtube: "",
  },
};

vi.mock("convex/react", () => ({
  useQuery: () => DEFAULT_BRANDING,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { PublicFooter } from "./public-footer";

describe("PublicFooter", () => {
  it("renders without crashing", () => {
    render(<PublicFooter orgSlug="test-org" />);
    const siteNames = screen.getAllByText("Test Community");
    expect(siteNames.length).toBeGreaterThanOrEqual(1);
  });

  it("displays the footer text from branding", () => {
    render(<PublicFooter orgSlug="test-org" />);
    const footerTexts = screen.getAllByText("Your local community calendar");
    expect(footerTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders quick links pointing to org routes", () => {
    render(<PublicFooter orgSlug="test-org" />);
    const eventsLinks = screen.getAllByText("Events Calendar");
    expect(eventsLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Business Directory").length).toBeGreaterThanOrEqual(1);
    const eventsLink = eventsLinks[0].closest("a");
    expect(eventsLink?.getAttribute("href")).toBe("/test-org/events");
  });

  it("renders social icon links for platforms with URLs", () => {
    render(<PublicFooter orgSlug="test-org" />);
    const fbLink = screen.getByLabelText("Facebook");
    expect(fbLink.getAttribute("href")).toBe("https://facebook.com/test");
    expect(fbLink.querySelector("svg")).toBeDefined();
    const igLink = screen.getByLabelText("Instagram");
    expect(igLink.getAttribute("href")).toBe("https://instagram.com/test");
    expect(igLink.querySelector("svg")).toBeDefined();
  });

  it("does not render social icons for platforms without URLs", () => {
    render(<PublicFooter orgSlug="test-org" />);
    expect(screen.queryByLabelText("Twitter / X")).toBeNull();
    expect(screen.queryByLabelText("YouTube")).toBeNull();
  });

  it("renders copyright with current year", () => {
    render(<PublicFooter orgSlug="test-org" />);
    const year = new Date().getFullYear();
    const matches = screen.getAllByText(new RegExp(`${year}`));
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
