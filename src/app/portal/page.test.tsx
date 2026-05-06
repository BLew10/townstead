import { describe, it, expect, vi, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";

let mockQueryReturn: unknown = undefined;

vi.mock("convex/react", () => ({
  useQuery: () => mockQueryReturn,
}));

vi.mock("@/hooks/use-stable-now", () => ({
  useStableNow: () => 1710000000000,
}));

import PortalDashboardPage from "./page";

describe("PortalDashboardPage", () => {
  it("renders loading skeletons when data is undefined", () => {
    mockQueryReturn = undefined;
    const { container } = render(<PortalDashboardPage />);
    expect(screen.getByText("Dashboard")).toBeDefined();
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders no-access state when data is null (permission denied)", () => {
    mockQueryReturn = null;
    render(<PortalDashboardPage />);
    expect(screen.getByText("Access Restricted")).toBeDefined();
  });

  it("renders welcome empty state when data has zero content", () => {
    mockQueryReturn = {
      activeAdsCount: 0,
      totalOutstanding: 0,
      upcomingPayments: [],
    };
    render(<PortalDashboardPage />);
    expect(screen.getByText("Welcome to your portal")).toBeDefined();
  });

  it("renders summary cards with data", () => {
    mockQueryReturn = {
      activeAdsCount: 3,
      totalOutstanding: 50000,
      upcomingPayments: [
        {
          dueDate: 1711000000000,
          amount: 25000,
          remaining: 25000,
          purchaseInvoice: "26-0001",
        },
      ],
    };
    render(<PortalDashboardPage />);
    expect(screen.getByText("Active Ads")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("Outstanding Balance")).toBeDefined();
    expect(screen.getByText("$500.00")).toBeDefined();
    expect(screen.getByText("Invoice #26-0001")).toBeDefined();
  });
});
