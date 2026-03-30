import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: false }),
  UserButton: () => <div data-testid="user-button" />,
  SignInButton: ({ children }: any) => <div data-testid="sign-in-button">{children}</div>,
}));

const mockBranding = {
  siteName: "Test Community",
  logoUrl: null as string | null,
  heroImageUrl: null as string | null,
};

vi.mock("convex/react", () => ({
  useQuery: () => mockBranding,
}));

vi.mock("@/hooks/use-community-filter", () => ({
  useCommunityFilter: (orgSlug: string) => ({
    communitySlug: undefined,
    communityId: undefined,
    communities: [],
    communityMap: new Map(),
    setCommunity: vi.fn(),
    buildHref: (segment: string) =>
      segment ? `/${orgSlug}/${segment}` : `/${orgSlug}`,
  }),
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

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="next-image" {...props} />
  ),
}));

import { PublicHeader } from "./public-header";

describe("PublicHeader", () => {
  beforeEach(() => {
    mockBranding.siteName = "Test Community";
    mockBranding.logoUrl = null;
    mockBranding.heroImageUrl = null;
  });

  it("renders without crashing", () => {
    render(<PublicHeader orgSlug="test-org" />);
    expect(screen.getByText("Test Community")).toBeDefined();
  });

  it("renders all navigation items including Home", () => {
    render(<PublicHeader orgSlug="test-org" />);
    expect(screen.getAllByText("Home").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Events").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Directory").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Coupons").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Blog").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Videos").length).toBeGreaterThanOrEqual(1);
  });

  it("Home link points to the org root", () => {
    render(<PublicHeader orgSlug="test-org" />);
    const homeLinks = screen.getAllByText("Home");
    const homeLink = homeLinks[0].closest("a");
    expect(homeLink?.getAttribute("href")).toBe("/test-org");
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

  it("renders text name when no logoUrl is set", () => {
    mockBranding.logoUrl = null;
    render(<PublicHeader orgSlug="test-org" />);
    expect(screen.getByText("Test Community")).toBeDefined();
    expect(screen.queryByTestId("next-image")).toBeNull();
  });

  it("renders logo image when logoUrl is set", () => {
    mockBranding.logoUrl = "https://example.com/logo.png";
    render(<PublicHeader orgSlug="test-org" />);
    const img = screen.getByTestId("next-image");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/logo.png");
    expect(img.getAttribute("alt")).toBe("Test Community");
  });
});
