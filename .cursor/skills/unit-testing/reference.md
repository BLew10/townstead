# Unit Testing — Detailed Reference Examples

Full worked examples for each test category. These are templates — adapt field names and values to the actual source being tested.

## P0: Billing Helpers (`convex/billing/helpers.test.ts`)

```typescript
import { describe, it, expect } from "vitest";
import {
  computeNet,
  computeLateFees,
  computeEarlyDiscount,
  computeBaseNet,
  computeAmountPaid,
  computeIsPaid,
  isScheduledPaymentLate,
  computeScheduledPaymentPaid,
  allocatePayment,
  generateScheduledPayments,
} from "./helpers";
import type { Doc, Id } from "../_generated/dataModel";

// ---------------------------------------------------------------------------
// Helpers: create typed stubs without needing real Convex IDs
// ---------------------------------------------------------------------------

type PaymentTermsDoc = Doc<"paymentTerms">;
type ScheduledPaymentDoc = Doc<"scheduledPayments">;
type PaymentAllocationDoc = Doc<"paymentAllocations">;

function makeTerms(
  overrides: Partial<PaymentTermsDoc> = {}
): PaymentTermsDoc {
  return {
    _id: "terms_1" as Id<"paymentTerms">,
    _creationTime: 0,
    orgId: "test_org",
    purchaseId: "purchase_1" as Id<"purchases">,
    totalSale: 120000, // $1,200.00
    ...overrides,
  } as PaymentTermsDoc;
}

function makeSP(
  overrides: Partial<ScheduledPaymentDoc> & { _id: string; dueDate: number; amount: number }
): ScheduledPaymentDoc {
  return {
    _creationTime: 0,
    orgId: "test_org",
    purchaseId: "purchase_1" as Id<"purchases">,
    year: 2026,
    month: 1,
    lateFeeWaived: false,
    ...overrides,
    _id: overrides._id as Id<"scheduledPayments">,
  } as ScheduledPaymentDoc;
}

function makeAllocation(
  spId: string,
  amount: number
): PaymentAllocationDoc {
  return {
    _id: `alloc_${Math.random()}` as Id<"paymentAllocations">,
    _creationTime: 0,
    orgId: "test_org",
    paymentId: "pay_1" as Id<"payments">,
    scheduledPaymentId: spId as Id<"scheduledPayments">,
    amount,
  } as PaymentAllocationDoc;
}

// ---------------------------------------------------------------------------
// computeBaseNet
// ---------------------------------------------------------------------------

describe("computeBaseNet", () => {
  it("returns totalSale when no adjustments", () => {
    expect(computeBaseNet({ totalSale: 120000 })).toBe(120000);
  });

  it("subtracts both discounts", () => {
    expect(
      computeBaseNet({ totalSale: 120000, discount1: 5000, discount2: 3000 })
    ).toBe(112000);
  });

  it("adds additional sales", () => {
    expect(
      computeBaseNet({ totalSale: 100000, additionalSale1: 5000, additionalSale2: 3000 })
    ).toBe(108000);
  });

  it("subtracts trade", () => {
    expect(computeBaseNet({ totalSale: 100000, trade: 10000 })).toBe(90000);
  });

  it("combines all adjustments", () => {
    // 120000 - 5000 - 3000 + 10000 + 2000 - 4000 = 120000
    expect(
      computeBaseNet({
        totalSale: 120000,
        discount1: 5000,
        discount2: 3000,
        additionalSale1: 10000,
        additionalSale2: 2000,
        trade: 4000,
      })
    ).toBe(120000);
  });
});

// ---------------------------------------------------------------------------
// computeEarlyDiscount
// ---------------------------------------------------------------------------

describe("computeEarlyDiscount", () => {
  it("returns 0 when no early discount configured", () => {
    expect(computeEarlyDiscount(makeTerms())).toBe(0);
  });

  it("returns 0 when type present but amount missing", () => {
    expect(
      computeEarlyDiscount(makeTerms({ earlyDiscountType: "flat" }))
    ).toBe(0);
  });

  it("returns flat amount directly", () => {
    expect(
      computeEarlyDiscount(
        makeTerms({ earlyDiscountType: "flat", earlyDiscountAmount: 5000 })
      )
    ).toBe(5000);
  });

  it("computes percent of totalSale, rounded", () => {
    // 10% of 120000 = 12000
    expect(
      computeEarlyDiscount(
        makeTerms({ earlyDiscountType: "percent", earlyDiscountAmount: 10 })
      )
    ).toBe(12000);
  });

  it("rounds percent discount to nearest cent", () => {
    // 7% of 99999 = 6999.93 → rounds to 7000
    expect(
      computeEarlyDiscount(
        makeTerms({
          totalSale: 99999,
          earlyDiscountType: "percent",
          earlyDiscountAmount: 7,
        })
      )
    ).toBe(7000);
  });
});

// ---------------------------------------------------------------------------
// isScheduledPaymentLate
// ---------------------------------------------------------------------------

describe("isScheduledPaymentLate", () => {
  const pastDue = 1700000000000; // fixed timestamp in the past
  const now = 1710000000000;

  it("returns true when past due and unpaid", () => {
    const sp = makeSP({ _id: "sp_1", dueDate: pastDue, amount: 10000 });
    expect(isScheduledPaymentLate(sp, [], now)).toBe(true);
  });

  it("returns true when past due and partially paid", () => {
    const sp = makeSP({ _id: "sp_1", dueDate: pastDue, amount: 10000 });
    const allocs = [makeAllocation("sp_1", 5000)];
    expect(isScheduledPaymentLate(sp, allocs, now)).toBe(true);
  });

  it("returns false when past due but fully paid", () => {
    const sp = makeSP({ _id: "sp_1", dueDate: pastDue, amount: 10000 });
    const allocs = [makeAllocation("sp_1", 10000)];
    expect(isScheduledPaymentLate(sp, allocs, now)).toBe(false);
  });

  it("returns false when late fee is waived", () => {
    const sp = makeSP({
      _id: "sp_1", dueDate: pastDue, amount: 10000, lateFeeWaived: true,
    });
    expect(isScheduledPaymentLate(sp, [], now)).toBe(false);
  });

  it("returns false when due date is in the future", () => {
    const sp = makeSP({ _id: "sp_1", dueDate: now + 86400000, amount: 10000 });
    expect(isScheduledPaymentLate(sp, [], now)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeLateFees
// ---------------------------------------------------------------------------

describe("computeLateFees", () => {
  const pastDue = 1700000000000;
  const now = 1710000000000;

  it("returns 0 when no late fee type configured", () => {
    const terms = makeTerms();
    expect(computeLateFees(terms, [], [], now)).toBe(0);
  });

  it("computes flat fee per late payment", () => {
    const terms = makeTerms({ lateFeeType: "flat", lateFeeAmount: 2500 });
    const sps = [
      makeSP({ _id: "sp_1", dueDate: pastDue, amount: 10000 }),
      makeSP({ _id: "sp_2", dueDate: pastDue, amount: 10000 }),
    ];
    // 2 late payments * $25.00 = $50.00
    expect(computeLateFees(terms, sps, [], now)).toBe(5000);
  });

  it("computes percent fee per late payment", () => {
    const terms = makeTerms({
      totalSale: 100000, lateFeeType: "percent", lateFeeAmount: 5,
    });
    const sps = [makeSP({ _id: "sp_1", dueDate: pastDue, amount: 10000 })];
    // 5% of 100000 = 5000 per late payment
    expect(computeLateFees(terms, sps, [], now)).toBe(5000);
  });

  it("excludes waived payments from late count", () => {
    const terms = makeTerms({ lateFeeType: "flat", lateFeeAmount: 2500 });
    const sps = [
      makeSP({ _id: "sp_1", dueDate: pastDue, amount: 10000 }),
      makeSP({ _id: "sp_2", dueDate: pastDue, amount: 10000, lateFeeWaived: true }),
    ];
    expect(computeLateFees(terms, sps, [], now)).toBe(2500);
  });

  it("returns 0 when all payments are on time", () => {
    const terms = makeTerms({ lateFeeType: "flat", lateFeeAmount: 2500 });
    const sps = [
      makeSP({ _id: "sp_1", dueDate: now + 86400000, amount: 10000 }),
    ];
    expect(computeLateFees(terms, sps, [], now)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeNet
// ---------------------------------------------------------------------------

describe("computeNet", () => {
  const now = 1710000000000;

  it("equals totalSale with no adjustments, no late fees, no early discount", () => {
    const terms = makeTerms({ totalSale: 100000 });
    expect(computeNet(terms, [], [], now)).toBe(100000);
  });

  it("applies discounts, additionals, and trade", () => {
    const terms = makeTerms({
      totalSale: 100000,
      discount1: 5000,
      additionalSale1: 3000,
      trade: 2000,
    });
    // 100000 - 5000 + 3000 - 2000 = 96000
    expect(computeNet(terms, [], [], now)).toBe(96000);
  });

  it("adds late fees and subtracts early discount", () => {
    const pastDue = 1700000000000;
    const terms = makeTerms({
      totalSale: 100000,
      lateFeeType: "flat",
      lateFeeAmount: 2500,
      earlyDiscountType: "flat",
      earlyDiscountAmount: 5000,
    });
    const sps = [makeSP({ _id: "sp_1", dueDate: pastDue, amount: 10000 })];
    // 100000 + 2500 (late fee) - 5000 (early discount) = 97500
    expect(computeNet(terms, sps, [], now)).toBe(97500);
  });
});

// ---------------------------------------------------------------------------
// allocatePayment
// ---------------------------------------------------------------------------

describe("allocatePayment", () => {
  const sp1 = makeSP({ _id: "sp_1", dueDate: 1700000000000, amount: 5000 });
  const sp2 = makeSP({ _id: "sp_2", dueDate: 1701000000000, amount: 5000 });

  it("fills earliest installment first", () => {
    const result = allocatePayment(5000, [sp2, sp1], []);
    expect(result).toEqual([
      { scheduledPaymentId: "sp_1", amount: 5000 },
    ]);
  });

  it("splits across multiple installments", () => {
    const result = allocatePayment(8000, [sp1, sp2], []);
    expect(result).toEqual([
      { scheduledPaymentId: "sp_1", amount: 5000 },
      { scheduledPaymentId: "sp_2", amount: 3000 },
    ]);
  });

  it("skips already-paid installments", () => {
    const allocs = [makeAllocation("sp_1", 5000)];
    const result = allocatePayment(3000, [sp1, sp2], allocs);
    expect(result).toEqual([
      { scheduledPaymentId: "sp_2", amount: 3000 },
    ]);
  });

  it("handles overpayment (more than total owed)", () => {
    const result = allocatePayment(15000, [sp1, sp2], []);
    expect(result).toEqual([
      { scheduledPaymentId: "sp_1", amount: 5000 },
      { scheduledPaymentId: "sp_2", amount: 5000 },
    ]);
  });

  it("returns empty when nothing owed", () => {
    const allocs = [makeAllocation("sp_1", 5000), makeAllocation("sp_2", 5000)];
    const result = allocatePayment(1000, [sp1, sp2], allocs);
    expect(result).toEqual([]);
  });

  it("returns empty for zero payment amount", () => {
    const result = allocatePayment(0, [sp1, sp2], []);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// generateScheduledPayments
// ---------------------------------------------------------------------------

describe("generateScheduledPayments", () => {
  it("returns empty for zero net", () => {
    expect(generateScheduledPayments(0, 2026)).toEqual([]);
  });

  it("returns empty for negative net", () => {
    expect(generateScheduledPayments(-100, 2026)).toEqual([]);
  });

  it("splits equally across 12 months with remainder on last", () => {
    const result = generateScheduledPayments(120001, 2026);
    expect(result).toHaveLength(12);

    const perMonth = Math.floor(120001 / 12); // 10000
    const remainder = 120001 - perMonth * 12;  // 1

    for (let i = 0; i < 11; i++) {
      expect(result[i].amount).toBe(perMonth);
    }
    expect(result[11].amount).toBe(perMonth + remainder);

    const totalAllocated = result.reduce((sum, p) => sum + p.amount, 0);
    expect(totalAllocated).toBe(120001);
  });

  it("uses custom months subset", () => {
    const result = generateScheduledPayments(30000, 2026, 1, true, [3, 6, 9]);
    expect(result).toHaveLength(3);
    expect(result[0].month).toBe(3);
    expect(result[1].month).toBe(6);
    expect(result[2].month).toBe(9);
  });

  it("creates single lump sum when splitEqually is false", () => {
    const result = generateScheduledPayments(50000, 2026, 15, false);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(50000);
    expect(result[0].month).toBe(1);
  });

  it("caps day to 28", () => {
    const result = generateScheduledPayments(10000, 2026, 31);
    const dueDate = new Date(result[0].dueDate);
    expect(dueDate.getDate()).toBe(28);
  });
});

// ---------------------------------------------------------------------------
// computeAmountPaid & computeIsPaid
// ---------------------------------------------------------------------------

describe("computeAmountPaid", () => {
  it("sums all allocation amounts", () => {
    const allocs = [makeAllocation("sp_1", 5000), makeAllocation("sp_2", 3000)];
    expect(computeAmountPaid(allocs)).toBe(8000);
  });

  it("returns 0 for empty array", () => {
    expect(computeAmountPaid([])).toBe(0);
  });
});

describe("computeIsPaid", () => {
  it("returns true when paid equals net", () => {
    expect(computeIsPaid(10000, 10000)).toBe(true);
  });

  it("returns true when overpaid", () => {
    expect(computeIsPaid(10000, 12000)).toBe(true);
  });

  it("returns false when underpaid", () => {
    expect(computeIsPaid(10000, 9999)).toBe(false);
  });
});
```

---

## P1: Utility Functions (`src/lib/utils.test.ts`)

```typescript
import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  dollarsToCents,
  centsToDollars,
  formatDate,
  formatDateTime,
} from "./utils";

describe("formatCurrency", () => {
  it("formats positive cents as USD", () => {
    expect(formatCurrency(15000)).toBe("$150.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats single-digit cents", () => {
    expect(formatCurrency(1)).toBe("$0.01");
  });

  it("formats large values with commas", () => {
    expect(formatCurrency(1000000)).toBe("$10,000.00");
  });
});

describe("dollarsToCents", () => {
  it("converts whole dollars", () => {
    expect(dollarsToCents(150)).toBe(15000);
  });

  it("converts fractional dollars", () => {
    expect(dollarsToCents(19.99)).toBe(1999);
  });

  it("rounds to nearest cent", () => {
    expect(dollarsToCents(1.005)).toBe(101); // Math.round(100.5)
  });
});

describe("centsToDollars", () => {
  it("converts cents to dollars", () => {
    expect(centsToDollars(15000)).toBe(150);
  });

  it("handles fractional result", () => {
    expect(centsToDollars(1999)).toBe(19.99);
  });
});

describe("formatDate", () => {
  it("formats a known timestamp", () => {
    // Jan 15, 2026 00:00:00 UTC
    const ts = new Date(2026, 0, 15).getTime();
    expect(formatDate(ts)).toBe("Jan 15, 2026");
  });
});

describe("formatDateTime", () => {
  it("formats a known timestamp with time", () => {
    const ts = new Date(2026, 0, 15, 14, 30).getTime();
    expect(formatDateTime(ts)).toBe("Jan 15, 2026 2:30 PM");
  });
});
```

---

## P2: Zod Validators (`src/lib/validators.test.ts`)

```typescript
import { describe, it, expect } from "vitest";
import {
  calendarEditionSchema,
  contactSchema,
  paymentTermsSchema,
  purchaseSchema,
  paymentSchema,
  adPricingSchema,
  monthlyPricesSchema,
} from "./validators";

describe("calendarEditionSchema", () => {
  it("accepts valid data", () => {
    const result = calendarEditionSchema.parse({ name: "Spring 2026", code: "SP26" });
    expect(result.name).toBe("Spring 2026");
  });

  it("rejects empty name", () => {
    expect(() => calendarEditionSchema.parse({ name: "", code: "SP26" }))
      .toThrow("Name is required");
  });

  it("rejects missing code", () => {
    expect(() => calendarEditionSchema.parse({ name: "Spring" }))
      .toThrow();
  });
});

describe("contactSchema", () => {
  const validContact = {
    company: "Acme",
    firstName: "Jane",
    lastName: "Doe",
  };

  it("accepts valid contact with required fields only", () => {
    expect(() => contactSchema.parse(validContact)).not.toThrow();
  });

  it("rejects empty firstName", () => {
    expect(() => contactSchema.parse({ ...validContact, firstName: "" }))
      .toThrow("First name is required");
  });

  it("accepts valid email", () => {
    expect(() =>
      contactSchema.parse({ ...validContact, email: "jane@example.com" })
    ).not.toThrow();
  });

  it("rejects invalid email", () => {
    expect(() =>
      contactSchema.parse({ ...validContact, email: "not-an-email" })
    ).toThrow("Invalid email");
  });

  it("accepts empty string email (opt-out)", () => {
    expect(() =>
      contactSchema.parse({ ...validContact, email: "" })
    ).not.toThrow();
  });

  it("accepts valid website URL", () => {
    expect(() =>
      contactSchema.parse({ ...validContact, website: "https://example.com" })
    ).not.toThrow();
  });

  it("rejects invalid website URL", () => {
    expect(() =>
      contactSchema.parse({ ...validContact, website: "not-a-url" })
    ).toThrow("Invalid URL");
  });

  it("allows omitting all optional fields", () => {
    const result = contactSchema.parse(validContact);
    expect(result.email).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.address).toBeUndefined();
  });
});

describe("paymentTermsSchema", () => {
  it("accepts minimal valid terms", () => {
    expect(() => paymentTermsSchema.parse({ totalSale: 100 })).not.toThrow();
  });

  it("rejects negative totalSale", () => {
    expect(() => paymentTermsSchema.parse({ totalSale: -1 })).toThrow();
  });

  it("accepts valid late fee configuration", () => {
    expect(() =>
      paymentTermsSchema.parse({
        totalSale: 1000,
        lateFeeType: "flat",
        lateFeeAmount: 25,
      })
    ).not.toThrow();
  });

  it("rejects invalid lateFeeType", () => {
    expect(() =>
      paymentTermsSchema.parse({
        totalSale: 1000,
        lateFeeType: "invalid",
      })
    ).toThrow();
  });

  it("validates dueDayOfMonth range 1-31", () => {
    expect(() =>
      paymentTermsSchema.parse({ totalSale: 100, dueDayOfMonth: 0 })
    ).toThrow();
    expect(() =>
      paymentTermsSchema.parse({ totalSale: 100, dueDayOfMonth: 32 })
    ).toThrow();
    expect(() =>
      paymentTermsSchema.parse({ totalSale: 100, dueDayOfMonth: 15 })
    ).not.toThrow();
  });

  it("validates scheduledMonths entries are 1-12", () => {
    expect(() =>
      paymentTermsSchema.parse({ totalSale: 100, scheduledMonths: [0] })
    ).toThrow();
    expect(() =>
      paymentTermsSchema.parse({ totalSale: 100, scheduledMonths: [13] })
    ).toThrow();
    expect(() =>
      paymentTermsSchema.parse({ totalSale: 100, scheduledMonths: [1, 6, 12] })
    ).not.toThrow();
  });
});

describe("purchaseSchema", () => {
  it("requires at least one calendar edition", () => {
    expect(() =>
      purchaseSchema.parse({ contactId: "c1", calendarEditionIds: [], year: 2026 })
    ).toThrow("At least one calendar edition is required");
  });

  it("validates year range", () => {
    expect(() =>
      purchaseSchema.parse({ contactId: "c1", calendarEditionIds: ["e1"], year: 1999 })
    ).toThrow();
  });
});

describe("paymentSchema", () => {
  it("requires amount greater than 0", () => {
    expect(() =>
      paymentSchema.parse({ purchaseId: "p1", amount: 0, date: Date.now() })
    ).toThrow("Amount must be greater than 0");
  });
});

describe("monthlyPricesSchema", () => {
  const validPrices = {
    jan: 100, feb: 100, mar: 100, apr: 100, may: 100, jun: 100,
    jul: 100, aug: 100, sep: 100, oct: 100, nov: 100, dec: 100,
  };

  it("accepts all valid monthly prices", () => {
    expect(() => monthlyPricesSchema.parse(validPrices)).not.toThrow();
  });

  it("rejects negative prices", () => {
    expect(() =>
      monthlyPricesSchema.parse({ ...validPrices, jan: -1 })
    ).toThrow();
  });
});
```

---

## P3: Security Tests (`convex/calendarEditions/queries.test.ts`)

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("security: calendarEditions.list", () => {
  it("returns only records matching the requested orgId", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("calendarEditions", {
        name: "Org A Ed", code: "A1", orgId: "org_a", isDeleted: false,
      });
      await ctx.db.insert("calendarEditions", {
        name: "Org B Ed", code: "B1", orgId: "org_b", isDeleted: false,
      });
    });

    const orgAResults = await t.query(api.calendarEditions.queries.list, {
      orgId: "org_a",
    });
    expect(orgAResults).toHaveLength(1);
    expect(orgAResults[0].name).toBe("Org A Ed");

    const orgBResults = await t.query(api.calendarEditions.queries.list, {
      orgId: "org_b",
    });
    expect(orgBResults).toHaveLength(1);
    expect(orgBResults[0].name).toBe("Org B Ed");
  });

  it("excludes soft-deleted records", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("calendarEditions", {
        name: "Active", code: "ACT", orgId: "org_1", isDeleted: false,
      });
      await ctx.db.insert("calendarEditions", {
        name: "Deleted", code: "DEL", orgId: "org_1", isDeleted: true,
      });
    });

    const results = await t.query(api.calendarEditions.queries.list, {
      orgId: "org_1",
    });
    expect(results).toHaveLength(1);
    expect(results[0].code).toBe("ACT");
  });
});

describe("security: calendarEditions.create", () => {
  it("rejects duplicate code within same org", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_1", name: "Edition 1", code: "ED1",
    });

    await expect(
      t.mutation(api.calendarEditions.mutations.create, {
        orgId: "org_1", name: "Edition 2", code: "ED1",
      })
    ).rejects.toThrowError("already exists");
  });

  it("allows same code in different orgs", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_1", name: "Edition 1", code: "ED1",
    });

    await expect(
      t.mutation(api.calendarEditions.mutations.create, {
        orgId: "org_2", name: "Edition 1", code: "ED1",
      })
    ).resolves.toBeDefined();
  });
});
```

---

## Frontend Component: Shared Data Table

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataTable } from "./data-table";
import { ColumnDef } from "@tanstack/react-table";

type TestRow = { id: string; name: string; status: string };

const columns: ColumnDef<TestRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "status", header: "Status" },
];

describe("DataTable", () => {
  it("renders column headers", () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
  });

  it("renders data rows", () => {
    const data: TestRow[] = [
      { id: "1", name: "Alice", status: "Active" },
      { id: "2", name: "Bob", status: "Inactive" },
    ];
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
  });

  it("shows empty state when no data", () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText("No results.")).toBeDefined();
  });
});
```

---

## Frontend Component: With Clerk/Convex/Next.js Mocks

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@clerk/nextjs", () => ({
  useOrganization: () => ({ organization: { name: "Test Org" } }),
  useUser: () => ({ user: { fullName: "Admin User" } }),
  UserButton: () => <div data-testid="user-button" />,
  OrganizationSwitcher: () => <div data-testid="org-switcher" />,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

import { AdminHeader } from "./header";

describe("AdminHeader", () => {
  it("renders user button", () => {
    render(<AdminHeader />);
    expect(screen.getByTestId("user-button")).toBeDefined();
  });

  it("renders organization switcher", () => {
    render(<AdminHeader />);
    expect(screen.getByTestId("org-switcher")).toBeDefined();
  });
});
```

---

## Convex Domain Test Template (Copy-Paste Starter)

Use this as a starting point for any new Convex domain. Replace `domainName` and table fields:

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("domainName.list", () => {
  it("tenant isolation — org_a cannot see org_b data", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("tableName", {
        name: "Org B Only",
        orgId: "org_b",
        isDeleted: false,
      });
    });
    const results = await t.query(api.domainName.queries.list, { orgId: "org_a" });
    expect(results).toHaveLength(0);
  });

  it("soft-delete filtering — excludes deleted records", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("tableName", {
        name: "Active",
        orgId: "org_1",
        isDeleted: false,
      });
      await ctx.db.insert("tableName", {
        name: "Deleted",
        orgId: "org_1",
        isDeleted: true,
      });
    });
    const results = await t.query(api.domainName.queries.list, { orgId: "org_1" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Active");
  });

  it("CRUD — create returns ID, read returns data", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.domainName.mutations.create, {
      orgId: "org_1",
      name: "New Record",
      // ...other required fields
    });
    expect(id).toBeDefined();
    const record = await t.query(api.domainName.queries.getById, { id });
    expect(record?.name).toBe("New Record");
  });
});
```

---

## P3: Auth-Based Security (Target Pattern)

When functions are migrated to extract `orgId` from `ctx.auth.getUserIdentity()`:

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("security: auth-based queries", () => {
  it("rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.contacts.queries.list)
    ).rejects.toThrowError("Not authenticated");
  });

  it("rejects identity without orgId", async () => {
    const t = convexTest(schema, modules);
    const noOrg = t.withIdentity({ name: "User Without Org" });
    await expect(
      noOrg.query(api.contacts.queries.list)
    ).rejects.toThrowError("No organization selected");
  });

  it("returns only data for authenticated org", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("contacts", {
        firstName: "Alice", lastName: "A", orgId: "org_a",
        isDeleted: false, searchText: "Alice A",
      });
      await ctx.db.insert("contacts", {
        firstName: "Bob", lastName: "B", orgId: "org_b",
        isDeleted: false, searchText: "Bob B",
      });
    });

    const asOrgA = t.withIdentity({ name: "Admin", orgId: "org_a" });
    const results = await asOrgA.query(api.contacts.queries.list);
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe("Alice");
  });
});
```

---

## P4: Domain Logic — Invoice Number Generation

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { modules } from "../test.setup";
import { generateInvoiceNumber } from "./helpers";

describe("generateInvoiceNumber", () => {
  it("generates first invoice as YY-0001", async () => {
    const t = convexTest(schema, modules);
    const result = await t.run(async (ctx) => {
      return await generateInvoiceNumber(ctx.db, 2026, "org_1");
    });
    expect(result).toBe("26-0001");
  });

  it("increments sequence from existing invoices", async () => {
    const t = convexTest(schema, modules);
    const result = await t.run(async (ctx) => {
      await ctx.db.insert("purchases", {
        orgId: "org_1",
        contactId: "c1" as any,
        year: 2026,
        invoiceNumber: "26-0003",
        isDeleted: false,
        calendarEditionIds: [],
      });
      return await generateInvoiceNumber(ctx.db, 2026, "org_1");
    });
    expect(result).toBe("26-0004");
  });

  it("ignores soft-deleted purchases", async () => {
    const t = convexTest(schema, modules);
    const result = await t.run(async (ctx) => {
      await ctx.db.insert("purchases", {
        orgId: "org_1",
        contactId: "c1" as any,
        year: 2026,
        invoiceNumber: "26-0005",
        isDeleted: true,
        calendarEditionIds: [],
      });
      return await generateInvoiceNumber(ctx.db, 2026, "org_1");
    });
    expect(result).toBe("26-0001");
  });

  it("scopes sequence to orgId", async () => {
    const t = convexTest(schema, modules);
    const result = await t.run(async (ctx) => {
      await ctx.db.insert("purchases", {
        orgId: "org_other",
        contactId: "c1" as any,
        year: 2026,
        invoiceNumber: "26-0010",
        isDeleted: false,
        calendarEditionIds: [],
      });
      return await generateInvoiceNumber(ctx.db, 2026, "org_1");
    });
    expect(result).toBe("26-0001");
  });
});
```
