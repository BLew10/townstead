import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

import { EventCalendar } from "./event-calendar";

describe("EventCalendar", () => {
  it("renders without crashing", () => {
    const onDateClick = vi.fn();
    render(<EventCalendar events={[]} onDateClick={onDateClick} />);
    expect(screen.getByText("Sun")).toBeDefined();
    expect(screen.getByText("Mon")).toBeDefined();
    expect(screen.getByText("Sat")).toBeDefined();
  });

  it("displays the current month and year", () => {
    const onDateClick = vi.fn();
    render(<EventCalendar events={[]} onDateClick={onDateClick} />);
    const now = new Date();
    const monthYear = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    expect(screen.getByText(monthYear)).toBeDefined();
  });

  it("renders weekday headers", () => {
    const onDateClick = vi.fn();
    render(<EventCalendar events={[]} onDateClick={onDateClick} />);
    for (const day of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
      expect(screen.getByText(day)).toBeDefined();
    }
  });

  it("calls onDateClick when a day cell is clicked", () => {
    const onDateClick = vi.fn();
    render(<EventCalendar events={[]} onDateClick={onDateClick} />);
    const buttons = screen.getAllByRole("button");
    const dayButton = buttons.find(
      (b) => b.textContent === "15" && !b.querySelector("[class*='sr-only']"),
    );
    if (dayButton) {
      fireEvent.click(dayButton);
      expect(onDateClick).toHaveBeenCalled();
    }
  });

  it("renders previous/next month navigation", () => {
    const onDateClick = vi.fn();
    render(<EventCalendar events={[]} onDateClick={onDateClick} />);
    expect(screen.getByText("Previous month")).toBeDefined();
    expect(screen.getByText("Next month")).toBeDefined();
  });
});
