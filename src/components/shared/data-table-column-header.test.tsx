import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { type Column } from "@tanstack/react-table";
import { DataTableColumnHeader } from "./data-table-column-header";

function createMockColumn(
  overrides: {
    canSort?: boolean;
    isSorted?: false | "asc" | "desc";
  } = {}
): Column<unknown, unknown> {
  return {
    getCanSort: () => overrides.canSort ?? false,
    getIsSorted: () => overrides.isSorted ?? false,
    toggleSorting: vi.fn(),
  } as unknown as Column<unknown, unknown>;
}

describe("DataTableColumnHeader", () => {
  it("renders title as plain text when column is not sortable", () => {
    const column = createMockColumn({ canSort: false });
    render(<DataTableColumnHeader column={column} title="Status" />);
    expect(screen.getByText("Status")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders as a sortable button when column is sortable", () => {
    const column = createMockColumn({ canSort: true });
    render(<DataTableColumnHeader column={column} title="Name" />);
    expect(screen.getByRole("button", { name: /Name/ })).toBeDefined();
  });

  it("renders title text regardless of sort state", () => {
    const column = createMockColumn({ canSort: true, isSorted: "asc" });
    render(<DataTableColumnHeader column={column} title="Amount" />);
    expect(screen.getByText("Amount")).toBeDefined();
  });
});
