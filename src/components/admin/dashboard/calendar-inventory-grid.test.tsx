import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

import { CalendarInventoryGrid } from "./calendar-inventory-grid";

function makeSlot(overrides: Partial<Parameters<typeof CalendarInventoryGrid>[0]["slots"][0]> = {}) {
  return {
    _id: "slot1",
    month: 1,
    slotNumber: 5,
    contactId: "c1",
    contactName: "Jane Doe",
    company: "Acme Corp",
    advertisementName: "Full Page",
    isDayType: true,
    purchaseId: "p1",
    ...overrides,
  };
}

describe("CalendarInventoryGrid", () => {
  it("renders without crashing with empty slots", () => {
    render(<CalendarInventoryGrid slots={[]} />);
    expect(screen.getByText("January")).toBeDefined();
    expect(screen.getByText("December")).toBeDefined();
  });

  it("renders all 12 months", () => {
    render(<CalendarInventoryGrid slots={[]} />);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    for (const month of months) {
      expect(screen.getByText(month)).toBeDefined();
    }
  });

  it("renders an occupied day-type slot with the company name", () => {
    const slot = makeSlot();
    render(<CalendarInventoryGrid slots={[slot]} />);
    expect(screen.getByText("Acme Corp")).toBeDefined();
  });

  it("renders non-day-type slots section when present", () => {
    const slot = makeSlot({ isDayType: false, slotNumber: null, advertisementName: "Back Cover" });
    render(<CalendarInventoryGrid slots={[slot]} />);
    expect(screen.getByText("Non-Day Ad Placements")).toBeDefined();
    const matches = screen.getAllByText("Back Cover");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
