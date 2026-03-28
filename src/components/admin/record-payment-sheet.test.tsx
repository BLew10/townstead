import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

vi.mock("@/hooks/use-org", () => ({
  useOrg: () => ({ orgId: "org_test" }),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  SheetDescription: ({ children }: any) => <p data-testid="sheet-description">{children}</p>,
  SheetFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/form", () => ({
  Form: ({ children }: any) => <div>{children}</div>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormField: ({ render }: any) =>
    render({ field: { value: "", onChange: vi.fn(), ref: vi.fn() } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: () => null,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => null,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: (props: any) => <input type="checkbox" {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { RecordPaymentSheet } from "./record-payment-sheet";

describe("RecordPaymentSheet", () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    purchaseId: "purchase_123" as any,
  };

  it("renders title and submit button when open", () => {
    render(<RecordPaymentSheet {...baseProps} />);
    const matches = screen.getAllByText("Record Payment");
    expect(matches).toHaveLength(2);
    expect(matches[0].tagName).toBe("H2");
    expect(matches[1].tagName).toBe("BUTTON");
  });

  it("does not render when closed", () => {
    render(<RecordPaymentSheet {...baseProps} open={false} />);
    expect(screen.queryByText("Record Payment")).toBeNull();
  });

  it("displays contact name and company in description", () => {
    render(
      <RecordPaymentSheet
        {...baseProps}
        contactName="Jane Smith"
        company="Acme Corp"
      />
    );
    const desc = screen.getByTestId("sheet-description");
    expect(desc.textContent).toContain("Jane Smith");
    expect(desc.textContent).toContain("Acme Corp");
  });

  it("displays invoice number in description", () => {
    render(
      <RecordPaymentSheet
        {...baseProps}
        invoiceNumber="26-0042"
      />
    );
    const desc = screen.getByTestId("sheet-description");
    expect(desc.textContent).toContain("Invoice #26-0042");
  });

  it("displays full context with all optional props", () => {
    render(
      <RecordPaymentSheet
        {...baseProps}
        contactName="Jane Smith"
        company="Acme Corp"
        invoiceNumber="26-0042"
      />
    );
    const desc = screen.getByTestId("sheet-description");
    expect(desc.textContent).toContain("Jane Smith — Acme Corp");
    expect(desc.textContent).toContain("Invoice #26-0042");
  });

  it("omits description when no optional props provided", () => {
    render(<RecordPaymentSheet {...baseProps} />);
    expect(screen.queryByTestId("sheet-description")).toBeNull();
  });

  it("renders form fields", () => {
    render(<RecordPaymentSheet {...baseProps} />);
    expect(screen.getByText("Amount ($)")).toBeDefined();
    expect(screen.getByText("Date")).toBeDefined();
    expect(screen.getByText("Payment Method")).toBeDefined();
  });
});
