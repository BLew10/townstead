import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="user-button" />,
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

vi.mock("next/navigation", () => ({
  usePathname: () => "/portal",
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetTrigger: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

import { PortalHeader } from "./header";

describe("PortalHeader", () => {
  it("renders without crashing", () => {
    render(<PortalHeader />);
    expect(screen.getByTestId("user-button")).toBeDefined();
  });

  it("displays the company name from portal auth", () => {
    render(<PortalHeader />);
    expect(screen.getByText("Test Company")).toBeDefined();
  });

  it("renders the mobile menu toggle", () => {
    render(<PortalHeader />);
    expect(screen.getByText("Toggle menu")).toBeDefined();
  });
});
