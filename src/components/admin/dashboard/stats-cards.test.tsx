import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

import { StatsCards } from "./stats-cards";

const defaultStats = {
  totalRevenue: 1500000,
  collectionRate: 87.5,
  outstandingBalance: 250000,
  latePaymentsCount: 3,
};

describe("StatsCards", () => {
  it("renders without crashing", () => {
    render(<StatsCards stats={defaultStats} />);
    expect(screen.getByText("Total Revenue")).toBeDefined();
  });

  it("displays formatted currency for totalRevenue", () => {
    render(<StatsCards stats={defaultStats} />);
    expect(screen.getByText("$15,000.00")).toBeDefined();
  });

  it("displays collection rate as a percentage", () => {
    render(<StatsCards stats={defaultStats} />);
    expect(screen.getByText("87.5%")).toBeDefined();
  });

  it("displays outstanding balance formatted as currency", () => {
    render(<StatsCards stats={defaultStats} />);
    expect(screen.getByText("$2,500.00")).toBeDefined();
  });

  it("displays late payments count", () => {
    render(<StatsCards stats={defaultStats} />);
    expect(screen.getByText("3")).toBeDefined();
  });

  it("renders all four stat cards", () => {
    render(<StatsCards stats={defaultStats} />);
    expect(screen.getByText("Total Revenue")).toBeDefined();
    expect(screen.getByText("Collection Rate")).toBeDefined();
    expect(screen.getByText("Outstanding Balance")).toBeDefined();
    expect(screen.getByText("Late Payments")).toBeDefined();
  });
});
