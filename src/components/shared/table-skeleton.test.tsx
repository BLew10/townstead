import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TableSkeleton } from "./table-skeleton";

describe("TableSkeleton", () => {
  it("renders correct number of skeleton elements with defaults (5 cols, 10 rows)", () => {
    const { container } = render(<TableSkeleton />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    // 1 search bar + 5 header cells + (10 rows × 5 cols) = 56
    expect(skeletons).toHaveLength(56);
  });

  it("renders correct number of skeleton elements with custom counts", () => {
    const { container } = render(<TableSkeleton columns={3} rows={4} />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    // 1 search bar + 3 header cells + (4 rows × 3 cols) = 16
    expect(skeletons).toHaveLength(16);
  });
});
