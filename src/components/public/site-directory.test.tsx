import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockSites = [
  { orgSlug: "alpha", siteName: "Alpha Community", tagline: "Events for all", logo: null },
  { orgSlug: "beta", siteName: "Beta Town", tagline: "Local news hub", logo: null },
  { orgSlug: "gamma", siteName: null, tagline: null, logo: null },
];

let queryReturn: typeof mockSites | undefined = mockSites;

vi.mock("convex/react", () => ({
  useQuery: () => queryReturn,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { SiteDirectory } from "./site-directory";

describe("SiteDirectory", () => {
  beforeEach(() => {
    queryReturn = mockSites;
  });

  it("renders without crashing with sites", () => {
    render(<SiteDirectory />);
    expect(screen.getByPlaceholderText("Search communities…")).toBeDefined();
  });

  it("displays site names and taglines", () => {
    render(<SiteDirectory />);
    expect(screen.getByText("Alpha Community")).toBeDefined();
    expect(screen.getByText("Events for all")).toBeDefined();
    expect(screen.getByText("Beta Town")).toBeDefined();
    expect(screen.getByText("Local news hub")).toBeDefined();
  });

  it("falls back to orgSlug when siteName is null", () => {
    render(<SiteDirectory />);
    expect(screen.getByText("gamma")).toBeDefined();
  });

  it("links each card to the correct /:orgSlug URL", () => {
    render(<SiteDirectory />);
    const alphaLink = screen.getByText("Alpha Community").closest("a");
    expect(alphaLink?.getAttribute("href")).toBe("/alpha");

    const gammaLink = screen.getByText("gamma").closest("a");
    expect(gammaLink?.getAttribute("href")).toBe("/gamma");
  });

  it("filters sites by search input matching siteName", () => {
    render(<SiteDirectory />);
    const input = screen.getByPlaceholderText("Search communities…");
    fireEvent.change(input, { target: { value: "Alpha" } });
    expect(screen.getByText("Alpha Community")).toBeDefined();
    expect(screen.queryByText("Beta Town")).toBeNull();
  });

  it("filters sites by search input matching orgSlug", () => {
    render(<SiteDirectory />);
    const input = screen.getByPlaceholderText("Search communities…");
    fireEvent.change(input, { target: { value: "gamma" } });
    expect(screen.getByText("gamma")).toBeDefined();
    expect(screen.queryByText("Alpha Community")).toBeNull();
  });

  it("shows empty state when search matches nothing", () => {
    render(<SiteDirectory />);
    const input = screen.getByPlaceholderText("Search communities…");
    fireEvent.change(input, { target: { value: "zzzzz" } });
    expect(screen.getByText(/No communities found/)).toBeDefined();
  });

  it("renders nothing when site list is empty", () => {
    queryReturn = [];
    const { container } = render(<SiteDirectory />);
    expect(container.innerHTML).toBe("");
  });

  it("shows skeleton while loading", () => {
    queryReturn = undefined;
    render(<SiteDirectory />);
    expect(screen.queryByPlaceholderText("Search communities…")).toBeNull();
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
