import { query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { v } from "convex/values";
import {
  computeNet,
  computeAmountPaid,
  computeLateFees,
  isScheduledPaymentLate,
  computeScheduledPaymentPaid,
} from "./helpers";

export const listPayments = query({
  args: {
    orgId: v.string(),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let payments: Doc<"payments">[];

    if (args.year) {
      const yearStart = new Date(args.year, 0, 1).getTime();
      const yearEnd = new Date(args.year + 1, 0, 1).getTime();
      payments = await ctx.db
        .query("payments")
        .withIndex("by_orgId_and_date", (q) =>
          q.eq("orgId", args.orgId).gte("date", yearStart)
        )
        .filter((q) => q.lt(q.field("date"), yearEnd))
        .collect();
    } else {
      payments = await ctx.db
        .query("payments")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect();
    }

    const enriched = await Promise.all(
      payments.map(async (payment) => {
        const purchase = await ctx.db.get(payment.purchaseId);
        const contact = purchase
          ? await ctx.db.get(purchase.contactId)
          : null;

        return {
          _id: payment._id,
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          checkNumber: payment.checkNumber,
          invoiceNumber: purchase?.invoiceNumber ?? null,
          purchaseId: payment.purchaseId,
          contactId: purchase?.contactId ?? null,
          contactEmail: contact?.email ?? null,
          contactName: contact
            ? `${contact.firstName} ${contact.lastName}`
            : "Unknown",
          company: contact?.company ?? "",
        };
      })
    );

    return enriched.sort((a, b) => b.date - a.date);
  },
});

export const listThisMonth = query({
  args: {
    orgId: v.string(),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const currentDate = new Date(now);
    const targetYear = args.year ?? currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const scheduledPayments = await ctx.db
      .query("scheduledPayments")
      .withIndex("by_orgId_and_year", (q) =>
        q.eq("orgId", args.orgId).eq("year", targetYear)
      )
      .collect();

    // Also get overdue from previous years if no year filter
    let overdueFromPast: Doc<"scheduledPayments">[] = [];
    if (!args.year) {
      const allSp = await ctx.db
        .query("scheduledPayments")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect();
      overdueFromPast = allSp.filter(
        (sp) => sp.year < currentYear && sp.dueDate < now
      );
    }

    const allSp = [...scheduledPayments, ...overdueFromPast];
    const uniqueSp = Array.from(
      new Map(allSp.map((sp) => [sp._id, sp])).values()
    );

    // Filter to this month's payments or overdue ones
    const filtered = uniqueSp.filter((sp) => {
      if (sp.dueDate < now) return true; // overdue — always show
      if (sp.year === currentYear && sp.month === currentMonth) return true;
      if (args.year && sp.year === args.year) return true; // year filter shows all
      return false;
    });

    const enriched = await Promise.all(
      filtered.map(async (sp) => {
        const purchase = await ctx.db.get(sp.purchaseId);
        if (!purchase || purchase.isDeleted) return null;

        const contact = await ctx.db.get(purchase.contactId);

        const allocations = await ctx.db
          .query("paymentAllocations")
          .withIndex("by_scheduledPaymentId", (q) =>
            q.eq("scheduledPaymentId", sp._id)
          )
          .collect();

        const paidAmount = computeScheduledPaymentPaid(sp._id, allocations);
        const isLate = isScheduledPaymentLate(sp, allocations, now);

        let status: "paid" | "partial" | "overdue" | "upcoming";
        if (paidAmount >= sp.amount) {
          status = "paid";
        } else if (isLate) {
          status = "overdue";
        } else if (paidAmount > 0) {
          status = "partial";
        } else {
          status = "upcoming";
        }

        return {
          _id: sp._id,
          purchaseId: sp.purchaseId,
          dueDate: sp.dueDate,
          amount: sp.amount,
          month: sp.month,
          year: sp.year,
          paidAmount,
          status,
          invoiceNumber: purchase.invoiceNumber ?? null,
          contactName: contact
            ? `${contact.firstName} ${contact.lastName}`
            : "Unknown",
          company: contact?.company ?? "",
          contactId: purchase.contactId,
          contactEmail: contact?.email ?? null,
        };
      })
    );

    return enriched
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => a.dueDate - b.dueDate);
  },
});

export const getCashFlowReport = query({
  args: {
    orgId: v.string(),
    calendarEditionId: v.id("calendarEditions"),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_orgId_and_year", (q) =>
        q.eq("orgId", args.orgId).eq("year", args.year)
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect()
      .then((ps) =>
        ps.filter((p) =>
          p.calendarEditionIds.includes(args.calendarEditionId)
        )
      );

    type MonthCell = { projected: number; actual: number };
    type ContactRow = {
      contactId: string;
      contactName: string;
      company: string;
      months: MonthCell[];
      yearTotal: MonthCell;
    };

    const rows: ContactRow[] = [];

    for (const purchase of purchases) {
      const contact = await ctx.db.get(purchase.contactId);
      const scheduledPayments = await ctx.db
        .query("scheduledPayments")
        .withIndex("by_purchaseId", (q) =>
          q.eq("purchaseId", purchase._id)
        )
        .collect();

      const allAllocations: Doc<"paymentAllocations">[] = [];
      for (const sp of scheduledPayments) {
        const spAllocs = await ctx.db
          .query("paymentAllocations")
          .withIndex("by_scheduledPaymentId", (q) =>
            q.eq("scheduledPaymentId", sp._id)
          )
          .collect();
        allAllocations.push(...spAllocs);
      }

      // Build per-month data
      const months: MonthCell[] = Array.from({ length: 12 }, () => ({
        projected: 0,
        actual: 0,
      }));

      for (const sp of scheduledPayments) {
        const monthIdx = sp.month - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          months[monthIdx].projected += sp.amount;

          // Actual = sum of allocations for this scheduled payment
          const spPaid = allAllocations
            .filter((a) => a.scheduledPaymentId === sp._id)
            .reduce((sum, a) => sum + a.amount, 0);
          months[monthIdx].actual += spPaid;
        }
      }

      const yearTotal: MonthCell = {
        projected: months.reduce((s, m) => s + m.projected, 0),
        actual: months.reduce((s, m) => s + m.actual, 0),
      };

      // Merge with existing contact row if same contact has multiple purchases
      const existingIdx = rows.findIndex(
        (r) => r.contactId === purchase.contactId.toString()
      );
      if (existingIdx >= 0) {
        for (let i = 0; i < 12; i++) {
          rows[existingIdx].months[i].projected += months[i].projected;
          rows[existingIdx].months[i].actual += months[i].actual;
        }
        rows[existingIdx].yearTotal.projected += yearTotal.projected;
        rows[existingIdx].yearTotal.actual += yearTotal.actual;
      } else {
        rows.push({
          contactId: purchase.contactId.toString(),
          contactName: contact
            ? `${contact.firstName} ${contact.lastName}`
            : "Unknown",
          company: contact?.company ?? "",
          months,
          yearTotal,
        });
      }
    }

    // Summary totals
    const summaryMonths: MonthCell[] = Array.from({ length: 12 }, () => ({
      projected: 0,
      actual: 0,
    }));
    for (const row of rows) {
      for (let i = 0; i < 12; i++) {
        summaryMonths[i].projected += row.months[i].projected;
        summaryMonths[i].actual += row.months[i].actual;
      }
    }
    const summaryTotal: MonthCell = {
      projected: summaryMonths.reduce((s, m) => s + m.projected, 0),
      actual: summaryMonths.reduce((s, m) => s + m.actual, 0),
    };

    return {
      rows: rows.sort((a, b) =>
        (a.company || a.contactName).localeCompare(
          b.company || b.contactName
        )
      ),
      summary: { months: summaryMonths, yearTotal: summaryTotal },
    };
  },
});

export const getInvoiceData = query({
  args: {
    purchaseId: v.id("purchases"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase || purchase.isDeleted || purchase.orgId !== args.orgId) {
      return null;
    }

    const contact = await ctx.db.get(purchase.contactId);
    const edition = purchase.calendarEditionIds.length > 0
      ? await ctx.db.get(purchase.calendarEditionIds[0])
      : null;

    const terms = await ctx.db
      .query("paymentTerms")
      .withIndex("by_purchaseId", (q) =>
        q.eq("purchaseId", purchase._id)
      )
      .first();

    const adPurchases = await ctx.db
      .query("adPurchases")
      .withIndex("by_purchaseId", (q) =>
        q.eq("purchaseId", purchase._id)
      )
      .collect();

    const lineItems = await Promise.all(
      adPurchases.map(async (ap) => {
        const ad = await ctx.db.get(ap.advertisementId);
        const apEdition = ap.calendarEditionId
          ? await ctx.db.get(ap.calendarEditionId)
          : edition;

        const pricingEditionId = ap.calendarEditionId ?? purchase.calendarEditionIds[0];
        const pricing = pricingEditionId
          ? await ctx.db
              .query("adPricing")
              .withIndex(
                "by_advertisementId_and_calendarEditionId_and_year",
                (q) =>
                  q
                    .eq("advertisementId", ap.advertisementId)
                    .eq("calendarEditionId", pricingEditionId)
                    .eq("year", purchase.year)
              )
              .first()
          : null;

        const slots = await ctx.db
          .query("adSlots")
          .withIndex("by_adPurchaseId", (q) =>
            q.eq("adPurchaseId", ap._id)
          )
          .collect();

        let unitPrice = 0;
        let total = 0;
        if (pricing) {
          const monthPrices = Object.values(pricing.monthlyPrices);
          unitPrice = Math.round(
            monthPrices.reduce((s, p) => s + p, 0) / monthPrices.length
          );
          total = unitPrice * ap.quantity;
        } else if (ap.charge != null && ap.charge > 0) {
          total = ap.charge;
          unitPrice = ap.quantity > 0 ? Math.round(ap.charge / ap.quantity) : ap.charge;
        }

        return {
          _id: ap._id,
          advertisementName: ad?.name ?? "Unknown",
          isDayType: ad?.isDayType ?? false,
          quantity: ap.quantity,
          unitPrice,
          total,
          calendarName: apEdition?.name ?? edition?.name ?? "",
          slots,
        };
      })
    );

    const scheduledPayments = await ctx.db
      .query("scheduledPayments")
      .withIndex("by_purchaseId", (q) =>
        q.eq("purchaseId", purchase._id)
      )
      .collect();

    const allAllocations: Doc<"paymentAllocations">[] = [];
    for (const sp of scheduledPayments) {
      const spAllocs = await ctx.db
        .query("paymentAllocations")
        .withIndex("by_scheduledPaymentId", (q) =>
          q.eq("scheduledPaymentId", sp._id)
        )
        .collect();
      allAllocations.push(...spAllocs);
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_purchaseId", (q) => q.eq("purchaseId", purchase._id))
      .collect();

    const now = Date.now();
    const net = terms
      ? computeNet(terms, scheduledPayments, allAllocations, now)
      : 0;
    const amountPaid = computeAmountPaid(allAllocations);

    const enrichedScheduledPayments = scheduledPayments
      .sort((a, b) => a.dueDate - b.dueDate)
      .map((sp) => ({
        ...sp,
        paidAmount: computeScheduledPaymentPaid(sp._id, allAllocations),
        isLate: isScheduledPaymentLate(sp, allAllocations, now),
      }));

    return {
      purchase,
      contact,
      edition,
      terms,
      lineItems,
      net,
      amountPaid,
      balance: Math.max(0, net - amountPaid),
      scheduledPayments: enrichedScheduledPayments,
      payments: payments.sort((a, b) => a.date - b.date),
    };
  },
});

export const getStatementData = query({
  args: {
    contactId: v.id("contacts"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.orgId !== args.orgId) return null;

    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_contactId", (q) =>
        q.eq("contactId", args.contactId)
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const now = Date.now();
    let overallBalance = 0;
    let latestStatementMessage: string | undefined;

    const purchaseRows = await Promise.all(
      purchases.map(async (purchase) => {
        const edition = purchase.calendarEditionIds.length > 0
          ? await ctx.db.get(purchase.calendarEditionIds[0])
          : null;
        const terms = await ctx.db
          .query("paymentTerms")
          .withIndex("by_purchaseId", (q) =>
            q.eq("purchaseId", purchase._id)
          )
          .first();

        if (terms?.statementMessage) {
          latestStatementMessage = terms.statementMessage;
        }

        const scheduledPayments = await ctx.db
          .query("scheduledPayments")
          .withIndex("by_purchaseId", (q) =>
            q.eq("purchaseId", purchase._id)
          )
          .collect();

        const allAllocations: Doc<"paymentAllocations">[] = [];
        for (const sp of scheduledPayments) {
          const spAllocs = await ctx.db
            .query("paymentAllocations")
            .withIndex("by_scheduledPaymentId", (q) =>
              q.eq("scheduledPaymentId", sp._id)
            )
            .collect();
          allAllocations.push(...spAllocs);
        }

        const net = terms
          ? computeNet(terms, scheduledPayments, allAllocations, now)
          : 0;
        const amountPaid = computeAmountPaid(allAllocations);
        const balance = Math.max(0, net - amountPaid);
        overallBalance += balance;

        return {
          _id: purchase._id,
          invoiceNumber: purchase.invoiceNumber,
          editionName: edition?.name ?? "Unknown",
          year: purchase.year,
          net,
          amountPaid,
          balance,
        };
      })
    );

    // Get all payments for this contact
    const allPayments = [];
    for (const purchase of purchases) {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_purchaseId", (q) =>
          q.eq("purchaseId", purchase._id)
        )
        .collect();

      const edition = purchase.calendarEditionIds.length > 0
        ? await ctx.db.get(purchase.calendarEditionIds[0])
        : null;

      for (const payment of payments) {
        allPayments.push({
          _id: payment._id,
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          checkNumber: payment.checkNumber,
          invoiceNumber: purchase.invoiceNumber,
          editionName: edition?.name ?? "Unknown",
          year: purchase.year,
        });
      }
    }

    return {
      contact,
      purchases: purchaseRows,
      payments: allPayments.sort((a, b) => b.date - a.date),
      overallBalance,
      statementMessage: latestStatementMessage,
    };
  },
});

/**
 * Per-purchase statement data matching v1's running-balance ledger format.
 * Returns chronologically interleaved late fees and payments with running balance.
 */
export const getStatementDataByPurchase = query({
  args: {
    purchaseId: v.id("purchases"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase || purchase.isDeleted || purchase.orgId !== args.orgId) {
      return null;
    }

    const contact = await ctx.db.get(purchase.contactId);
    const edition =
      purchase.calendarEditionIds.length > 0
        ? await ctx.db.get(purchase.calendarEditionIds[0])
        : null;

    const terms = await ctx.db
      .query("paymentTerms")
      .withIndex("by_purchaseId", (q) => q.eq("purchaseId", purchase._id))
      .first();

    const scheduledPayments = await ctx.db
      .query("scheduledPayments")
      .withIndex("by_purchaseId", (q) => q.eq("purchaseId", purchase._id))
      .collect();

    const allAllocations: Doc<"paymentAllocations">[] = [];
    for (const sp of scheduledPayments) {
      const spAllocs = await ctx.db
        .query("paymentAllocations")
        .withIndex("by_scheduledPaymentId", (q) =>
          q.eq("scheduledPaymentId", sp._id)
        )
        .collect();
      allAllocations.push(...spAllocs);
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_purchaseId", (q) => q.eq("purchaseId", purchase._id))
      .collect();

    const now = Date.now();
    const net = terms
      ? computeNet(terms, scheduledPayments, allAllocations, now)
      : 0;
    const amountPaid = computeAmountPaid(allAllocations);

    const prepaidPayment = payments.find((p) => p.isPrepaid);

    // Compute late fee per occurrence
    let lateFeePerOccurrence = 0;
    if (terms?.lateFeeType && terms.lateFeeAmount) {
      lateFeePerOccurrence =
        terms.lateFeeType === "flat"
          ? terms.lateFeeAmount
          : Math.round(terms.totalSale * (terms.lateFeeAmount / 100));
    }

    // Count late fees already baked into net (for the starting balance)
    const totalLateFees = terms
      ? computeLateFees(terms, scheduledPayments, allAllocations, now)
      : 0;

    // Starting balance = net minus late fees minus prepaid (we add late fees back as ledger entries)
    const startingBalance =
      net - totalLateFees + (prepaidPayment?.amount ?? 0);

    // Build running-balance ledger entries
    type LedgerEntry = {
      date: number;
      description: string;
      amount: number;
      type: "charge" | "late_fee" | "payment";
    };

    const entries: LedgerEntry[] = [];

    // Late fee entries from scheduled payments
    for (const sp of scheduledPayments) {
      const isLate = isScheduledPaymentLate(sp, allAllocations, now);
      if (isLate && !sp.lateFeeWaived && lateFeePerOccurrence > 0) {
        entries.push({
          date: sp.dueDate,
          description: "Late Fee",
          amount: lateFeePerOccurrence,
          type: "late_fee",
        });
      }
    }

    // Payment entries (exclude prepaid since it's part of initial balance in v1)
    for (const p of payments) {
      if (p.isPrepaid) continue;
      const methodDesc = [
        p.method?.replace("_", " ") ?? "Deposit",
        p.checkNumber ?? "",
      ]
        .filter(Boolean)
        .join(" ");
      entries.push({
        date: p.date,
        description: methodDesc,
        amount: p.amount,
        type: "payment",
      });
    }

    entries.sort((a, b) => a.date - b.date);

    // Compute past-due and next-payment for summary block
    let pastDueAmount = 0;
    for (const sp of scheduledPayments) {
      const isLate = isScheduledPaymentLate(sp, allAllocations, now);
      if (isLate) {
        const spPaid = computeScheduledPaymentPaid(sp._id, allAllocations);
        pastDueAmount += sp.amount - spPaid;
        if (!sp.lateFeeWaived && lateFeePerOccurrence > 0) {
          pastDueAmount += lateFeePerOccurrence;
        }
      }
    }

    // Next unpaid scheduled payment
    const sortedSp = [...scheduledPayments].sort(
      (a, b) => a.dueDate - b.dueDate
    );
    let nextPaymentDueDate = 0;
    let nextPaymentAmount = 0;
    for (const sp of sortedSp) {
      const spPaid = computeScheduledPaymentPaid(sp._id, allAllocations);
      if (spPaid < sp.amount) {
        nextPaymentDueDate = sp.dueDate;
        nextPaymentAmount = sp.amount - spPaid;
        break;
      }
    }

    return {
      purchase,
      contact,
      edition,
      terms,
      invoiceNumber: purchase.invoiceNumber,
      year: purchase.year,
      editionName: edition?.name ?? "Unknown",
      startingBalance,
      ledgerEntries: entries,
      pastDueAmount,
      nextPaymentDueDate,
      nextPaymentAmount,
      totalAmountDue: pastDueAmount + nextPaymentAmount,
      balance: Math.max(0, net - amountPaid),
    };
  },
});
