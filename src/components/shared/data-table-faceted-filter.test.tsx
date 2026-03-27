import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { type Column } from "@tanstack/react-table";
import {
  DataTableFacetedFilter,
  type FilterOption,
} from "./data-table-faceted-filter";

const options: FilterOption[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

function createMockColumn(
  overrides: Partial<Column<unknown, unknown>> = {}
): Column<unknown, unknown> {
  return {
    id: "status",
    getFacetedUniqueValues: () => new Map<string, number>(),
    getFilterValue: () => undefined,
    setFilterValue: vi.fn(),
    ...overrides,
  } as unknown as Column<unknown, unknown>;
}

describe("DataTableFacetedFilter", () => {
  it("renders filter button with title", () => {
    const column = createMockColumn();
    render(
      <DataTableFacetedFilter
        column={column}
        title="Status"
        options={options}
      />
    );
    expect(screen.getByText("Status")).toBeDefined();
  });

  it("renders as a button element", () => {
    const column = createMockColumn();
    render(
      <DataTableFacetedFilter
        column={column}
        title="Category"
        options={options}
      />
    );
    expect(screen.getByRole("button", { name: /Category/ })).toBeDefined();
  });
});
