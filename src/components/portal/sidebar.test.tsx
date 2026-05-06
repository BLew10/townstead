import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/portal",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/hooks/use-portal-auth", () => ({
  usePortalAuth: () => ({
    contact: { company: "Test Company" },
    contactId: "c1",
    grantId: "g1",
    isLoading: false,
    isLinked: true,
    permissions: [
      "portal:view",
      "portal:assets",
      "portal:messages",
      "portal:payments",
      "portal:invoices",
    ],
  }),
}));

import { PortalSidebar, PortalSidebarMobile } from "./sidebar";

describe("PortalSidebar", () => {
  it("renders without crashing", () => {
    render(<PortalSidebar />);
    expect(screen.getByText("Client Portal")).toBeDefined();
  });

  it("renders all navigation items", () => {
    render(<PortalSidebar />);
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("My Ads")).toBeDefined();
    expect(screen.getByText("Payments")).toBeDefined();
    expect(screen.getByText("Invoices")).toBeDefined();
    expect(screen.getByText("Assets")).toBeDefined();
    expect(screen.getByText("My Profile")).toBeDefined();
  });

  it("links point to correct portal routes", () => {
    render(<PortalSidebar />);
    const adsLink = screen.getByText("My Ads").closest("a");
    expect(adsLink?.getAttribute("href")).toBe("/portal/ads");
  });
});

describe("PortalSidebarMobile", () => {
  it("renders all nav items", () => {
    render(<PortalSidebarMobile />);
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("My Ads")).toBeDefined();
  });

  it("calls onNavigate when a link is clicked", () => {
    const onNavigate = vi.fn();
    render(<PortalSidebarMobile onNavigate={onNavigate} />);
    screen.getByText("Payments").click();
    expect(onNavigate).toHaveBeenCalled();
  });
});
