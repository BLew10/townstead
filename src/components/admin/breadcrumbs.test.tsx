import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let mockPathname = "/admin/contacts";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/breadcrumb", () => ({
  Breadcrumb: ({ children, ...props }: any) => (
    <nav aria-label="breadcrumb" {...props}>
      {children}
    </nav>
  ),
  BreadcrumbList: ({ children }: any) => <ol>{children}</ol>,
  BreadcrumbItem: ({ children }: any) => <li>{children}</li>,
  BreadcrumbLink: ({ children, render: _r, ...props }: any) => (
    <a {...props}>{children}</a>
  ),
  BreadcrumbPage: ({ children }: any) => <span>{children}</span>,
  BreadcrumbSeparator: () => <span>/</span>,
}));

import { AdminBreadcrumbs } from "./breadcrumbs";

describe("AdminBreadcrumbs", () => {
  it("renders breadcrumbs for a two-segment path", () => {
    mockPathname = "/admin/contacts";
    render(<AdminBreadcrumbs />);
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Contacts")).toBeDefined();
  });

  it("returns null for a single-segment path", () => {
    mockPathname = "/admin";
    const { container } = render(<AdminBreadcrumbs />);
    expect(container.innerHTML).toBe("");
  });

  it("skips Convex ID segments", () => {
    mockPathname = "/admin/purchases/abc123def456ghij";
    render(<AdminBreadcrumbs />);
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Purchases")).toBeDefined();
    expect(screen.queryByText("abc123def456ghij")).toBeNull();
  });

  it("applies overrides for dynamic segments", () => {
    mockPathname = "/admin/billing/abc123def456ghij";
    render(
      <AdminBreadcrumbs
        overrides={{ abc123def456ghij: { label: "INV 25-0001" } }}
      />,
    );
    expect(screen.getByText("INV 25-0001")).toBeDefined();
  });
});
