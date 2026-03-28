import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
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

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: any) => <div>{children}</div>,
  CollapsibleTrigger: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  CollapsibleContent: ({ children }: any) => <div>{children}</div>,
}));

import { AdminSidebar, AdminSidebarMobile } from "./sidebar";

describe("AdminSidebar", () => {
  it("renders without crashing", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Planner App")).toBeDefined();
  });

  it("renders core navigation items", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Calendars")).toBeDefined();
    expect(screen.getByText("Contacts")).toBeDefined();
    expect(screen.getByText("Advertisements")).toBeDefined();
    expect(screen.getByText("Purchases")).toBeDefined();
    expect(screen.getByText("Billing")).toBeDefined();
    expect(screen.getByText("Layouts")).toBeDefined();
    expect(screen.getByText("Address Books")).toBeDefined();
  });

  it("renders community site collapsible group", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Community Site")).toBeDefined();
    expect(screen.getByText("Events")).toBeDefined();
    expect(screen.getByText("Communities")).toBeDefined();
    expect(screen.getByText("Blog")).toBeDefined();
    expect(screen.getByText("Coupons")).toBeDefined();
    expect(screen.getByText("Videos")).toBeDefined();
    expect(screen.getByText("Categories")).toBeDefined();
    expect(screen.getByText("Site Branding")).toBeDefined();
  });

  it("links point to correct admin routes", () => {
    render(<AdminSidebar />);
    const calendarLink = screen.getByText("Calendars").closest("a");
    expect(calendarLink?.getAttribute("href")).toBe("/admin/calendars");

    const communitiesLink = screen.getByText("Communities").closest("a");
    expect(communitiesLink?.getAttribute("href")).toBe("/admin/communities");
  });
});

describe("AdminSidebarMobile", () => {
  it("renders nav items and children", () => {
    render(
      <AdminSidebarMobile>
        <div data-testid="child-content">Extra</div>
      </AdminSidebarMobile>,
    );
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByTestId("child-content")).toBeDefined();
  });

  it("calls onNavigate when a link is clicked", () => {
    const onNavigate = vi.fn();
    render(<AdminSidebarMobile onNavigate={onNavigate}>extra</AdminSidebarMobile>);
    screen.getByText("Billing").click();
    expect(onNavigate).toHaveBeenCalled();
  });
});
