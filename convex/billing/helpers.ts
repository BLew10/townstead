import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";

type PaymentTermsDoc = Doc<"paymentTerms">;
type ScheduledPaymentDoc = Doc<"scheduledPayments">;
type PaymentAllocationDoc = Doc<"paymentAllocations">;

export function isScheduledPaymentLate(
  sp: ScheduledPaymentDoc,
  allocations: PaymentAllocationDoc[],
  now: number = Date.now()
): boolean {
  if (sp.lateFeeWaived) return false;
  const paid = allocations
    .filter((a) => a.scheduledPaymentId === sp._id)
    .reduce((sum, a) => sum + a.amount, 0);
  return sp.dueDate < now && paid < sp.amount;
}

export function computeScheduledPaymentPaid(
  spId: Id<"scheduledPayments">,
  allocations: PaymentAllocationDoc[]
): number {
  return allocations
    .filter((a) => a.scheduledPaymentId === spId)
    .reduce((sum, a) => sum + a.amount, 0);
}

export function computeLateFees(
  terms: PaymentTermsDoc,
  scheduledPayments: ScheduledPaymentDoc[],
  allocations: PaymentAllocationDoc[],
  now: number = Date.now()
): number {
  if (!terms.lateFeeType || !terms.lateFeeAmount) return 0;

  const lateCount = scheduledPayments.filter((sp) =>
    isScheduledPaymentLate(sp, allocations, now)
  ).length;

  if (lateCount === 0) return 0;

  if (terms.lateFeeType === "flat") {
    return lateCount * terms.lateFeeAmount;
  }

  return lateCount * Math.round(terms.totalSale * (terms.lateFeeAmount / 100));
}

/**
 * Per spec: early discount is an upfront line-item subtraction from net,
 * NOT conditional on payment timing. Always applied when present.
 */
export function computeEarlyDiscount(terms: PaymentTermsDoc): number {
  if (!terms.earlyDiscountType || !terms.earlyDiscountAmount) return 0;

  if (terms.earlyDiscountType === "flat") {
    return terms.earlyDiscountAmount;
  }
  return Math.round(terms.totalSale * (terms.earlyDiscountAmount / 100));
}

export function computeNet(
  terms: PaymentTermsDoc,
  scheduledPayments: ScheduledPaymentDoc[],
  allocations: PaymentAllocationDoc[],
  now: number = Date.now()
): number {
  const lateFees = computeLateFees(terms, scheduledPayments, allocations, now);
  const earlyDiscount = computeEarlyDiscount(terms);

  return (
    terms.totalSale -
    (terms.discount1 ?? 0) -
    (terms.discount2 ?? 0) +
    (terms.additionalSale1 ?? 0) +
    (terms.additionalSale2 ?? 0) -
    (terms.trade ?? 0) +
    lateFees -
    earlyDiscount
  );
}

/**
 * Base net before late fees or early discounts — used to split
 * scheduled payment amounts at purchase creation time.
 */
export function computeBaseNet(terms: {
  totalSale: number;
  discount1?: number;
  discount2?: number;
  additionalSale1?: number;
  additionalSale2?: number;
  trade?: number;
}): number {
  return (
    terms.totalSale -
    (terms.discount1 ?? 0) -
    (terms.discount2 ?? 0) +
    (terms.additionalSale1 ?? 0) +
    (terms.additionalSale2 ?? 0) -
    (terms.trade ?? 0)
  );
}

export function computeAmountPaid(allocations: PaymentAllocationDoc[]): number {
  return allocations.reduce((sum, a) => sum + a.amount, 0);
}

export function computeIsPaid(net: number, amountPaid: number): boolean {
  return amountPaid >= net;
}

export type AllocationPlan = {
  scheduledPaymentId: Id<"scheduledPayments">;
  amount: number;
};

export function allocatePayment(
  amount: number,
  scheduledPayments: ScheduledPaymentDoc[],
  existingAllocations: PaymentAllocationDoc[]
): AllocationPlan[] {
  const sorted = [...scheduledPayments].sort((a, b) => a.dueDate - b.dueDate);
  let remaining = amount;
  const newAllocations: AllocationPlan[] = [];

  for (const sp of sorted) {
    if (remaining <= 0) break;
    const alreadyPaid = existingAllocations
      .filter((a) => a.scheduledPaymentId === sp._id)
      .reduce((sum, a) => sum + a.amount, 0);
    const owed = sp.amount - alreadyPaid;
    if (owed <= 0) continue;
    const toAllocate = Math.min(remaining, owed);
    newAllocations.push({ scheduledPaymentId: sp._id, amount: toAllocate });
    remaining -= toAllocate;
  }

  return newAllocations;
}

export async function generateInvoiceNumber(
  db: DatabaseReader,
  year: number,
  orgId: string
): Promise<string> {
  const existing = await db
    .query("purchases")
    .withIndex("by_orgId_and_year", (q) =>
      q.eq("orgId", orgId).eq("year", year)
    )
    .filter((q) => q.neq(q.field("isDeleted"), true))
    .collect();

  let maxSeq = 0;
  for (const p of existing) {
    if (p.invoiceNumber) {
      const num = p.invoiceNumber.replace("-", "");
      const seq = parseInt(num.slice(-4), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }

  const yy = String(year).slice(-2);
  const nnnn = String(maxSeq + 1).padStart(4, "0");
  return `${yy}${nnnn}`;
}

export type ScheduledPaymentInput = {
  dueDate: number;
  amount: number;
  month: number;
  year: number;
};

export type CustomScheduleEntry = {
  month: number;
  year: number;
  amount: number;
};

/**
 * Enumerate all (month, year) pairs in a range, inclusive on both ends.
 * month values are 1-12.
 */
export function enumerateMonthRange(
  startMonth: number,
  startYear: number,
  endMonth: number,
  endYear: number
): Array<{ month: number; year: number }> {
  const result: Array<{ month: number; year: number }> = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    result.push({ month: m, year: y });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return result;
}

/**
 * Generate scheduled payment entries from payment terms.
 * Supports multi-year date ranges and custom per-month amounts.
 * Uses integer math since all money values are stored in cents.
 */
export function generateScheduledPayments(opts: {
  baseNet: number;
  dueDayOfMonth?: number;
  splitEqually?: boolean;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
  customSchedule?: CustomScheduleEntry[];
}): ScheduledPaymentInput[] {
  const {
    baseNet,
    dueDayOfMonth = 1,
    splitEqually = true,
    startMonth,
    startYear,
    endMonth,
    endYear,
    customSchedule,
  } = opts;

  if (baseNet <= 0) return [];

  function clampedDueDate(year: number, month: number): number {
    const lastDay = new Date(year, month, 0).getDate();
    const day = Math.min(dueDayOfMonth, lastDay);
    return new Date(year, month - 1, day).getTime();
  }

  if (!splitEqually && customSchedule && customSchedule.length > 0) {
    const entries = customSchedule.filter((e) => e.amount > 0);
    if (entries.length === 0) return [];

    let runningTotal = 0;
    const payments: ScheduledPaymentInput[] = entries.map((e, i) => {
      const isLast = i === entries.length - 1;
      let amount = e.amount;
      if (isLast) {
        amount = baseNet - runningTotal;
      }
      runningTotal += amount;
      return {
        dueDate: clampedDueDate(e.year, e.month),
        amount,
        month: e.month,
        year: e.year,
      };
    });
    return payments;
  }

  const months = enumerateMonthRange(startMonth, startYear, endMonth, endYear);
  if (months.length === 0) return [];

  const count = months.length;
  const perMonth = Math.floor(baseNet / count);
  const remainder = baseNet - perMonth * count;

  return months.map(({ month, year }, i) => {
    const isLast = i === count - 1;
    const amount = isLast ? perMonth + remainder : perMonth;
    return {
      dueDate: clampedDueDate(year, month),
      amount,
      month,
      year,
    };
  });
}
