import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

type MockProps = { children?: React.ReactNode } & Record<string, unknown>;

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: MockProps) => <div>{children}</div>,
  TooltipProvider: ({ children }: MockProps) => <div>{children}</div>,
  TooltipTrigger: (props: MockProps) => {
    const { children, asChild, ...rest } = props;
    void asChild;
    return <div {...rest}>{children}</div>;
  },
  TooltipContent: ({ children }: MockProps) => <div>{children}</div>,
}));

import { MonthSlotGrid } from "./month-slot-grid";

describe("MonthSlotGrid", () => {
  it("renders 35 cells by default plus a 7-column header", () => {
    const { container } = render(
      <MonthSlotGrid year={2026} month={1} occupants={{}} mode="readonly" />,
    );
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(35);
    const headerCols = container.querySelectorAll(".grid.grid-cols-7 > div");
    // first row of 7 are the S M T W T F S labels
    expect(headerCols.length).toBeGreaterThanOrEqual(7);
  });

  it("shows day-of-month for slots within the month and slot-only for floating slots", () => {
    // Feb 2026 has 28 days. Slots 1..28 show day numbers; 29..35 show slot only.
    render(
      <MonthSlotGrid year={2026} month={2} occupants={{}} mode="readonly" />,
    );
    // Slot 1 has aria-label "Slot 1, day 1, open"
    expect(screen.getByLabelText(/Slot 1, day 1, open/)).toBeDefined();
    expect(screen.getByLabelText(/Slot 28, day 28, open/)).toBeDefined();
    expect(screen.getByLabelText(/Slot 29, floating, open/)).toBeDefined();
    expect(screen.getByLabelText(/Slot 35, floating, open/)).toBeDefined();
  });

  it("renders SMTWTFS header labels", () => {
    const { container } = render(
      <MonthSlotGrid year={2026} month={1} occupants={{}} mode="readonly" />,
    );
    const labels = Array.from(container.querySelectorAll(".grid-cols-7"))[0]
      .children;
    const text = Array.from(labels)
      .map((el) => el.textContent?.trim())
      .join("");
    expect(text).toBe("SMTWTFS");
  });

  it("marks selected slots with aria-pressed in editor mode", () => {
    render(
      <MonthSlotGrid
        year={2026}
        month={1}
        occupants={{}}
        selectedSlots={new Set([3, 9])}
        mode="editor"
      />,
    );
    const slot3 = screen.getByLabelText(/Slot 3, day 3, selected/);
    expect(slot3.getAttribute("aria-pressed")).toBe("true");
    const slot1 = screen.getByLabelText(/Slot 1, day 1, open/);
    expect(slot1.getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onToggle in editor mode and onCellClick (only when occupied) in readonly mode", () => {
    const toggle = vi.fn();
    const click = vi.fn();
    const occupants = {
      5: [{ contactId: "c1", company: "Acme" }],
    };

    const { rerender } = render(
      <MonthSlotGrid
        year={2026}
        month={1}
        occupants={occupants}
        mode="editor"
        onToggle={toggle}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Slot 5, day 5, occupied/));
    fireEvent.click(screen.getByLabelText(/Slot 7, day 7, open/));
    expect(toggle).toHaveBeenCalledWith(5);
    expect(toggle).toHaveBeenCalledWith(7);

    rerender(
      <MonthSlotGrid
        year={2026}
        month={1}
        occupants={occupants}
        mode="readonly"
        onCellClick={click}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Slot 5, day 5, occupied/));
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.calls[0][0]).toBe(5);

    // Open cells in readonly are disabled — click should not fire
    fireEvent.click(screen.getByLabelText(/Slot 7, day 7, open/));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("respects custom slotsPerMonth", () => {
    const { container } = render(
      <MonthSlotGrid
        year={2026}
        month={1}
        slotsPerMonth={42}
        occupants={{}}
        mode="readonly"
      />,
    );
    expect(container.querySelectorAll("button").length).toBe(42);
  });
});
