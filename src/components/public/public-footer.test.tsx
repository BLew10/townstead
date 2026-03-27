import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("convex/react", () => ({
  useQuery: () => ({
    siteName: "Test Community",
    footerText: "Your local community calendar",
    socialLinks: {
      facebook: "https://facebook.com/test",
      instagram: "https://instagram.com/test",
    },
  }),
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

  it("renders social links for active platforms", () => {
    render(<PublicFooter orgSlug="test-org" />);
    const fbLinks = screen.getAllByLabelText("Facebook");
    expect(fbLinks[0].getAttribute("href")).toBe("https://facebook.com/test");
    const igLinks = screen.getAllByLabelText("Instagram");
    expect(igLinks[0].getAttribute("href")).toBe("https://instagram.com/test");
  });

  it("renders copyright with current year", () => {
    render(<PublicFooter orgSlug="test-org" />);
    const year = new Date().getFullYear();
    const matches = screen.getAllByText(new RegExp(`${year}`));
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
