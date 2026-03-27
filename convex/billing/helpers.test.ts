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
// Typed stub factories — create documents without real Convex IDs
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
    totalSale: 120000,
    ...overrides,
  } as PaymentTermsDoc;
}

function makeSP(
  overrides: Partial<ScheduledPaymentDoc> & {
    _id: string;
    dueDate: number;
    amount: number;
  }
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
    _id: `alloc_${spId}_${amount}` as Id<"paymentAllocations">,
    _creationTime: 0,
    orgId: "test_org",
    paymentId: "pay_1" as Id<"payments">,
    scheduledPaymentId: spId as Id<"scheduledPayments">,
    amount,
  } as PaymentAllocationDoc;
}

// Fixed timestamps for deterministic tests
const PAST = 1700000000000;
const NOW = 1710000000000;
const FUTURE = NOW + 86_400_000;

// ---------------------------------------------------------------------------
// computeBaseNet
// ---------------------------------------------------------------------------

describe("computeBaseNet", () => {
  it("returns totalSale when no adjustments", () => {
    expect(computeBaseNet({ totalSale: 120000 })).toBe(120000);
  });

  it("subtracts discount1", () => {
    expect(computeBaseNet({ totalSale: 120000, discount1: 5000 })).toBe(115000);
  });

  it("subtracts discount2", () => {
    expect(computeBaseNet({ totalSale: 120000, discount2: 3000 })).toBe(117000);
  });

  it("subtracts both discounts", () => {
    expect(
      computeBaseNet({ totalSale: 120000, discount1: 5000, discount2: 3000 })
    ).toBe(112000);
  });

  it("adds additionalSale1", () => {
    expect(
      computeBaseNet({ totalSale: 100000, additionalSale1: 5000 })
    ).toBe(105000);
  });

  it("adds additionalSale2", () => {
    expect(
      computeBaseNet({ totalSale: 100000, additionalSale2: 3000 })
    ).toBe(103000);
  });

  it("subtracts trade", () => {
    expect(computeBaseNet({ totalSale: 100000, trade: 10000 })).toBe(90000);
  });

  it("combines all adjustments correctly", () => {
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

  it("handles zero totalSale", () => {
    expect(computeBaseNet({ totalSale: 0 })).toBe(0);
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

  it("returns 0 when amount present but type missing", () => {
    expect(
      computeEarlyDiscount(makeTerms({ earlyDiscountAmount: 5000 }))
    ).toBe(0);
  });

  it("returns flat amount directly", () => {
    expect(
      computeEarlyDiscount(
        makeTerms({ earlyDiscountType: "flat", earlyDiscountAmount: 5000 })
      )
    ).toBe(5000);
  });

  it("computes percent of totalSale", () => {
    // 10% of 120000 = 12000
    expect(
      computeEarlyDiscount(
        makeTerms({ earlyDiscountType: "percent", earlyDiscountAmount: 10 })
      )
    ).toBe(12000);
  });

  it("rounds percent discount to nearest integer (cent)", () => {
    // 7% of 99999 = 6999.93 → Math.round → 7000
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
  it("returns true when past due and unpaid", () => {
    const sp = makeSP({ _id: "sp_1", dueDate: PAST, amount: 10000 });
    expect(isScheduledPaymentLate(sp, [], NOW)).toBe(true);
  });

  it("returns true when past due and partially paid", () => {
    const sp = makeSP({ _id: "sp_1", dueDate: PAST, amount: 10000 });
    const allocs = [makeAllocation("sp_1", 5000)];
    expect(isScheduledPaymentLate(sp, allocs, NOW)).toBe(true);
  });

  it("returns false when past due but fully paid", () => {
    const sp = makeSP({ _id: "sp_1", dueDate: PAST, amount: 10000 });
    const allocs = [makeAllocation("sp_1", 10000)];
    expect(isScheduledPaymentLate(sp, allocs, NOW)).toBe(false);
  });

  it("returns false when past due but overpaid", () => {
    const sp = makeSP({ _id: "sp_1", dueDate: PAST, amount: 10000 });
    const allocs = [makeAllocation("sp_1", 12000)];
    expect(isScheduledPaymentLate(sp, allocs, NOW)).toBe(false);
  });

  it("returns false when late fee is waived", () => {
    const sp = makeSP({
      _id: "sp_1",
      dueDate: PAST,
      amount: 10000,
      lateFeeWaived: true,
    });
    expect(isScheduledPaymentLate(sp, [], NOW)).toBe(false);
  });

  it("returns false when due date is in the future", () => {
    const sp = makeSP({ _id: "sp_1", dueDate: FUTURE, amount: 10000 });
    expect(isScheduledPaymentLate(sp, [], NOW)).toBe(false);
  });

  it("ignores allocations for other scheduled payments", () => {
    const sp = makeSP({ _id: "sp_1", dueDate: PAST, amount: 10000 });
    const allocs = [makeAllocation("sp_other", 10000)];
    expect(isScheduledPaymentLate(sp, allocs, NOW)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeScheduledPaymentPaid
// ---------------------------------------------------------------------------

describe("computeScheduledPaymentPaid", () => {
  it("sums allocations for the given scheduled payment", () => {
    const allocs = [
      makeAllocation("sp_1", 3000),
      makeAllocation("sp_1", 2000),
    ];
    expect(
      computeScheduledPaymentPaid("sp_1" as Id<"scheduledPayments">, allocs)
    ).toBe(5000);
  });

  it("returns 0 when no allocations exist", () => {
    expect(
      computeScheduledPaymentPaid("sp_1" as Id<"scheduledPayments">, [])
    ).toBe(0);
  });

  it("ignores allocations for other scheduled payments", () => {
    const allocs = [
      makeAllocation("sp_1", 3000),
      makeAllocation("sp_other", 5000),
    ];
    expect(
      computeScheduledPaymentPaid("sp_1" as Id<"scheduledPayments">, allocs)
    ).toBe(3000);
  });
});

// ---------------------------------------------------------------------------
// computeLateFees
// ---------------------------------------------------------------------------

describe("computeLateFees", () => {
  it("returns 0 when no late fee type configured", () => {
    const terms = makeTerms();
    expect(computeLateFees(terms, [], [], NOW)).toBe(0);
  });

  it("returns 0 when late fee type set but amount missing", () => {
    const terms = makeTerms({ lateFeeType: "flat" });
    expect(computeLateFees(terms, [], [], NOW)).toBe(0);
  });

  it("returns 0 when no scheduled payments are late", () => {
    const terms = makeTerms({ lateFeeType: "flat", lateFeeAmount: 2500 });
    const sps = [makeSP({ _id: "sp_1", dueDate: FUTURE, amount: 10000 })];
    expect(computeLateFees(terms, sps, [], NOW)).toBe(0);
  });

  it("computes flat fee per late payment", () => {
    const terms = makeTerms({ lateFeeType: "flat", lateFeeAmount: 2500 });
    const sps = [
      makeSP({ _id: "sp_1", dueDate: PAST, amount: 10000 }),
      makeSP({ _id: "sp_2", dueDate: PAST, amount: 10000 }),
    ];
    // 2 late * $25.00 = $50.00
    expect(computeLateFees(terms, sps, [], NOW)).toBe(5000);
  });

  it("computes percent fee per late payment", () => {
    const terms = makeTerms({
      totalSale: 100000,
      lateFeeType: "percent",
      lateFeeAmount: 5,
    });
    const sps = [makeSP({ _id: "sp_1", dueDate: PAST, amount: 10000 })];
    // 5% of 100000 = 5000
    expect(computeLateFees(terms, sps, [], NOW)).toBe(5000);
  });

  it("excludes waived payments from late count", () => {
    const terms = makeTerms({ lateFeeType: "flat", lateFeeAmount: 2500 });
    const sps = [
      makeSP({ _id: "sp_1", dueDate: PAST, amount: 10000 }),
      makeSP({
        _id: "sp_2",
        dueDate: PAST,
        amount: 10000,
        lateFeeWaived: true,
      }),
    ];
    expect(computeLateFees(terms, sps, [], NOW)).toBe(2500);
  });

  it("excludes fully-paid late payments from late count", () => {
    const terms = makeTerms({ lateFeeType: "flat", lateFeeAmount: 2500 });
    const sps = [
      makeSP({ _id: "sp_1", dueDate: PAST, amount: 10000 }),
      makeSP({ _id: "sp_2", dueDate: PAST, amount: 10000 }),
    ];
    const allocs = [makeAllocation("sp_2", 10000)];
    // Only sp_1 is late
    expect(computeLateFees(terms, sps, allocs, NOW)).toBe(2500);
  });
});

// ---------------------------------------------------------------------------
// computeNet
// ---------------------------------------------------------------------------

describe("computeNet", () => {
  it("equals totalSale with no adjustments, no late fees, no early discount", () => {
    const terms = makeTerms({ totalSale: 100000 });
    expect(computeNet(terms, [], [], NOW)).toBe(100000);
  });

  it("applies discounts and trade", () => {
    const terms = makeTerms({
      totalSale: 100000,
      discount1: 5000,
      discount2: 3000,
      trade: 2000,
    });
    // 100000 - 5000 - 3000 - 2000 = 90000
    expect(computeNet(terms, [], [], NOW)).toBe(90000);
  });

  it("applies additional sales", () => {
    const terms = makeTerms({
      totalSale: 100000,
      additionalSale1: 5000,
      additionalSale2: 3000,
    });
    expect(computeNet(terms, [], [], NOW)).toBe(108000);
  });

  it("adds late fees", () => {
    const terms = makeTerms({
      totalSale: 100000,
      lateFeeType: "flat",
      lateFeeAmount: 2500,
    });
    const sps = [makeSP({ _id: "sp_1", dueDate: PAST, amount: 10000 })];
    // 100000 + 2500
    expect(computeNet(terms, sps, [], NOW)).toBe(102500);
  });

  it("subtracts early discount", () => {
    const terms = makeTerms({
      totalSale: 100000,
      earlyDiscountType: "flat",
      earlyDiscountAmount: 5000,
    });
    expect(computeNet(terms, [], [], NOW)).toBe(95000);
  });

  it("combines all adjustments together", () => {
    const terms = makeTerms({
      totalSale: 100000,
      discount1: 5000,
      additionalSale1: 3000,
      trade: 2000,
      lateFeeType: "flat",
      lateFeeAmount: 2500,
      earlyDiscountType: "flat",
      earlyDiscountAmount: 1000,
    });
    const sps = [makeSP({ _id: "sp_1", dueDate: PAST, amount: 10000 })];
    // 100000 - 5000 + 3000 - 2000 + 2500 - 1000 = 97500
    expect(computeNet(terms, sps, [], NOW)).toBe(97500);
  });
});

// ---------------------------------------------------------------------------
// computeAmountPaid
// ---------------------------------------------------------------------------

describe("computeAmountPaid", () => {
  it("sums all allocation amounts", () => {
    const allocs = [makeAllocation("sp_1", 5000), makeAllocation("sp_2", 3000)];
    expect(computeAmountPaid(allocs)).toBe(8000);
  });

  it("returns 0 for empty array", () => {
    expect(computeAmountPaid([])).toBe(0);
  });

  it("handles single allocation", () => {
    expect(computeAmountPaid([makeAllocation("sp_1", 7500)])).toBe(7500);
  });
});

// ---------------------------------------------------------------------------
// computeIsPaid
// ---------------------------------------------------------------------------

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

  it("returns true when both are zero", () => {
    expect(computeIsPaid(0, 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// allocatePayment
// ---------------------------------------------------------------------------

describe("allocatePayment", () => {
  const sp1 = makeSP({ _id: "sp_1", dueDate: 1700000000000, amount: 5000 });
  const sp2 = makeSP({ _id: "sp_2", dueDate: 1701000000000, amount: 5000 });
  const sp3 = makeSP({ _id: "sp_3", dueDate: 1702000000000, amount: 5000 });

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

  it("fills all installments exactly", () => {
    const result = allocatePayment(15000, [sp1, sp2, sp3], []);
    expect(result).toEqual([
      { scheduledPaymentId: "sp_1", amount: 5000 },
      { scheduledPaymentId: "sp_2", amount: 5000 },
      { scheduledPaymentId: "sp_3", amount: 5000 },
    ]);
  });

  it("skips already-paid installments", () => {
    const allocs = [makeAllocation("sp_1", 5000)];
    const result = allocatePayment(3000, [sp1, sp2], allocs);
    expect(result).toEqual([
      { scheduledPaymentId: "sp_2", amount: 3000 },
    ]);
  });

  it("accounts for partial prior payments", () => {
    const allocs = [makeAllocation("sp_1", 3000)];
    const result = allocatePayment(5000, [sp1, sp2], allocs);
    expect(result).toEqual([
      { scheduledPaymentId: "sp_1", amount: 2000 },
      { scheduledPaymentId: "sp_2", amount: 3000 },
    ]);
  });

  it("handles overpayment (stops when all installments filled)", () => {
    const result = allocatePayment(20000, [sp1, sp2], []);
    expect(result).toEqual([
      { scheduledPaymentId: "sp_1", amount: 5000 },
      { scheduledPaymentId: "sp_2", amount: 5000 },
    ]);
  });

  it("returns empty when nothing owed", () => {
    const allocs = [
      makeAllocation("sp_1", 5000),
      makeAllocation("sp_2", 5000),
    ];
    const result = allocatePayment(1000, [sp1, sp2], allocs);
    expect(result).toEqual([]);
  });

  it("returns empty for zero payment amount", () => {
    expect(allocatePayment(0, [sp1, sp2], [])).toEqual([]);
  });

  it("returns empty for empty scheduled payments", () => {
    expect(allocatePayment(5000, [], [])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// generateScheduledPayments
// ---------------------------------------------------------------------------

describe("generateScheduledPayments", () => {
  const fullYear = (baseNet: number, year = 2026) =>
    generateScheduledPayments({
      baseNet,
      startMonth: 1,
      startYear: year,
      endMonth: 12,
      endYear: year,
    });

  it("returns empty for zero net", () => {
    expect(fullYear(0)).toEqual([]);
  });

  it("returns empty for negative net", () => {
    expect(fullYear(-100)).toEqual([]);
  });

  it("splits equally across 12 months", () => {
    const result = fullYear(120000);
    expect(result).toHaveLength(12);
    result.forEach((p) => expect(p.amount).toBe(10000));
  });

  it("puts remainder on last month when not evenly divisible", () => {
    const result = fullYear(120001);
    expect(result).toHaveLength(12);

    const perMonth = Math.floor(120001 / 12);
    const remainder = 120001 - perMonth * 12;

    for (let i = 0; i < 11; i++) {
      expect(result[i].amount).toBe(perMonth);
    }
    expect(result[11].amount).toBe(perMonth + remainder);

    const total = result.reduce((sum, p) => sum + p.amount, 0);
    expect(total).toBe(120001);
  });

  it("supports partial year range", () => {
    const result = generateScheduledPayments({
      baseNet: 30000,
      startMonth: 3,
      startYear: 2026,
      endMonth: 5,
      endYear: 2026,
    });
    expect(result).toHaveLength(3);
    expect(result[0].month).toBe(3);
    expect(result[1].month).toBe(4);
    expect(result[2].month).toBe(5);
    expect(result.reduce((s, p) => s + p.amount, 0)).toBe(30000);
  });

  it("supports multi-year ranges", () => {
    const result = generateScheduledPayments({
      baseNet: 60000,
      startMonth: 10,
      startYear: 2025,
      endMonth: 3,
      endYear: 2026,
    });
    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({ month: 10, year: 2025 });
    expect(result[5]).toMatchObject({ month: 3, year: 2026 });
    expect(result.reduce((s, p) => s + p.amount, 0)).toBe(60000);
  });

  it("uses custom schedule when splitEqually is false", () => {
    const result = generateScheduledPayments({
      baseNet: 50000,
      splitEqually: false,
      startMonth: 1,
      startYear: 2026,
      endMonth: 12,
      endYear: 2026,
      customSchedule: [
        { month: 1, year: 2026, amount: 30000 },
        { month: 6, year: 2026, amount: 20000 },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0].amount).toBe(30000);
    expect(result[1].amount).toBe(20000);
  });

  it("adjusts last custom entry to match baseNet exactly", () => {
    const result = generateScheduledPayments({
      baseNet: 50000,
      splitEqually: false,
      startMonth: 1,
      startYear: 2026,
      endMonth: 12,
      endYear: 2026,
      customSchedule: [
        { month: 1, year: 2026, amount: 30000 },
        { month: 6, year: 2026, amount: 19999 },
      ],
    });
    expect(result.reduce((s, p) => s + p.amount, 0)).toBe(50000);
    expect(result[1].amount).toBe(20000);
  });

  it("clamps dueDayOfMonth to last day of each month", () => {
    const result = generateScheduledPayments({
      baseNet: 30000,
      dueDayOfMonth: 31,
      startMonth: 1,
      startYear: 2026,
      endMonth: 3,
      endYear: 2026,
    });
    expect(new Date(result[0].dueDate).getDate()).toBe(31); // Jan has 31
    expect(new Date(result[1].dueDate).getDate()).toBe(28); // Feb 2026 has 28
    expect(new Date(result[2].dueDate).getDate()).toBe(31); // Mar has 31
  });

  it("sets correct due dates for each month", () => {
    const result = fullYear(120000);
    expect(result[0].dueDate).toBe(new Date(2026, 0, 1).getTime());
    expect(result[5].dueDate).toBe(new Date(2026, 5, 1).getTime());
    expect(result[11].dueDate).toBe(new Date(2026, 11, 1).getTime());
  });

  it("assigns correct year and month fields", () => {
    const result = fullYear(120000);
    result.forEach((p, i) => {
      expect(p.year).toBe(2026);
      expect(p.month).toBe(i + 1);
    });
  });

  it("uses floor-based split so preview matches schedule (no Math.round drift)", () => {
    // $2850 over 36 months: 285000 / 36 = 7916.666…
    // Math.floor gives 7916 cents per month, remainder 24 cents on last month
    // Math.round would give 7917 * 36 = 285012 — overshoot!
    const netCents = 285000;
    const result = generateScheduledPayments({
      baseNet: netCents,
      startMonth: 1,
      startYear: 2026,
      endMonth: 12,
      endYear: 2028,
    });
    expect(result).toHaveLength(36);

    const perMonth = Math.floor(netCents / 36); // 7916
    const remainder = netCents - perMonth * 36;  // 24

    for (let i = 0; i < 35; i++) {
      expect(result[i].amount).toBe(perMonth);
    }
    expect(result[35].amount).toBe(perMonth + remainder);

    const total = result.reduce((sum, p) => sum + p.amount, 0);
    expect(total).toBe(netCents);
  });

  it("total of payments always equals baseNet for various indivisible amounts", () => {
    const testCases = [
      { net: 100000, months: 3 },   // 33333 * 2 + 33334
      { net: 100000, months: 7 },   // 14285 * 6 + 14290
      { net: 95000, months: 12 },   // 7916 * 11 + 7924
      { net: 1, months: 3 },        // 0 * 2 + 1
      { net: 50000, months: 36 },   // 1388 * 35 + 1420
    ];

    for (const { net, months } of testCases) {
      const endYear = 2026 + Math.floor((months - 1) / 12);
      const endMonth = ((months - 1) % 12) + 1;
      const result = generateScheduledPayments({
        baseNet: net,
        startMonth: 1,
        startYear: 2026,
        endMonth,
        endYear,
      });
      expect(result).toHaveLength(months);
      const total = result.reduce((sum, p) => sum + p.amount, 0);
      expect(total).toBe(net);
    }
  });
});
