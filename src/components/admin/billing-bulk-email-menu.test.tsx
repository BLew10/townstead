import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: any) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  AlertDialogAction: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

import { BillingBulkEmailMenu, type BillingBulkEmailRow } from "./billing-bulk-email-menu";

const rows: BillingBulkEmailRow[] = [
  {
    purchaseId: "p1",
    contactId: "c1",
    contactEmail: "test@example.com",
    displayName: "Acme Corp",
    invoiceNumber: "25-0001",
  },
  {
    purchaseId: "p2",
    contactId: "c2",
    contactEmail: null,
    displayName: "No Email LLC",
  },
];

describe("BillingBulkEmailMenu", () => {
  it("renders disabled button when no rows are selected", () => {
    render(
      <BillingBulkEmailMenu selectedRows={[]} onComplete={vi.fn()} />,
    );
    const btn = screen.getByText("Select rows to send");
    expect(btn).toBeDefined();
    expect(btn.closest("button")?.disabled).toBe(true);
  });

  it("renders enabled button with count when rows are selected", () => {
    render(
      <BillingBulkEmailMenu selectedRows={rows} onComplete={vi.fn()} />,
    );
    expect(screen.getByText("Bulk Actions (2)")).toBeDefined();
  });

  it("shows Send Invoices and Send Statements options", () => {
    render(
      <BillingBulkEmailMenu selectedRows={rows} onComplete={vi.fn()} />,
    );
    expect(screen.getByText("Send Invoices")).toBeDefined();
    expect(screen.getByText("Send Statements")).toBeDefined();
  });

  it("opens confirmation dialog when Send Invoices is clicked", () => {
    render(
      <BillingBulkEmailMenu selectedRows={rows} onComplete={vi.fn()} />,
    );
    act(() => {
      fireEvent.click(screen.getByText("Send Invoices"));
    });
    expect(screen.getByTestId("alert-dialog")).toBeDefined();
  });
});
