import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";

type TestRow = { id: string; name: string; email: string };

const columns: ColumnDef<TestRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
];

const testData: TestRow[] = [
  { id: "1", name: "Alice", email: "alice@test.com" },
  { id: "2", name: "Bob", email: "bob@test.com" },
];

describe("DataTable", () => {
  it("renders column headers", () => {
    render(<DataTable columns={columns} data={testData} />);
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Email")).toBeDefined();
  });

  it("renders data rows", () => {
    render(<DataTable columns={columns} data={testData} />);
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("bob@test.com")).toBeDefined();
  });

  it("shows empty state for empty data", () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText("No results")).toBeDefined();
    expect(screen.getByText("No items found.")).toBeDefined();
  });

  it("shows custom empty state text", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyTitle="No contacts"
        emptyDescription="Add your first contact."
      />
    );
    expect(screen.getByText("No contacts")).toBeDefined();
    expect(screen.getByText("Add your first contact.")).toBeDefined();
  });

  it("displays item count", () => {
    render(<DataTable columns={columns} data={testData} />);
    expect(screen.getByText("2 items")).toBeDefined();
  });
});
