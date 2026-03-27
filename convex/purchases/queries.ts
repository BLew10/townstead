import { query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { v } from "convex/values";
import {
  computeNet,
  computeAmountPaid,
  computeIsPaid,
  computeLateFees,
  isScheduledPaymentLate,
  computeScheduledPaymentPaid,
} from "../billing/helpers";

async function getEditionNames(ctx: { db: any }, editionIds: any[]) {
  const names: string[] = [];
  for (const id of editionIds) {
    const edition = await ctx.db.get(id);
    if (edition) names.push(edition.name);
  }
  return names;
}

export const list = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const enriched = await Promise.all(
      purchases.map(async (purchase) => {
        const contact = await ctx.db.get(purchase.contactId);

        const editionNames = await getEditionNames(
          ctx,
          purchase.calendarEditionIds
        );

        const terms = await ctx.db
          .query("paymentTerms")
          .withIndex("by_purchaseId", (q) =>
            q.eq("purchaseId", purchase._id)
          )
          .first();

        const scheduledPayments = await ctx.db
          .query("scheduledPayments")
          .withIndex("by_purchaseId", (q) =>
            q.eq("purchaseId", purchase._id)
          )
          .collect();

        const allAllocations: Doc<"paymentAllocations">[] = [];
        for (const sp of scheduledPayments) {
          const spAllocations = await ctx.db
            .query("paymentAllocations")
            .withIndex("by_scheduledPaymentId", (q) =>
              q.eq("scheduledPaymentId", sp._id)
            )
            .collect();
          allAllocations.push(...spAllocations);
        }

        const net = terms
          ? computeNet(terms, scheduledPayments, allAllocations)
          : 0;
        const amountPaid = computeAmountPaid(allAllocations);
        const isPaid = computeIsPaid(net, amountPaid);
        const hasLate = scheduledPayments.some((sp) =>
          isScheduledPaymentLate(sp, allAllocations)
        );

        return {
          ...purchase,
          contactName: contact
            ? `${contact.firstName} ${contact.lastName}`
            : "Unknown",
          company: contact?.company ?? "",
          editionName: editionNames.join(", ") || "Unknown",
          net,
          amountPaid,
          isPaid,
          hasLate,
        };
      })
    );

    return enriched;
  },
});

export const getById = query({
  args: { id: v.id("purchases") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getDetail = query({
  args: { id: v.id("purchases") },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.id);
    if (!purchase || purchase.isDeleted) return null;

    const contact = await ctx.db.get(purchase.contactId);

    const editions = [];
    for (const eid of purchase.calendarEditionIds) {
      const ed = await ctx.db.get(eid);
      if (ed) editions.push(ed);
    }

    const terms = await ctx.db
      .query("paymentTerms")
      .withIndex("by_purchaseId", (q) => q.eq("purchaseId", purchase._id))
      .first();

    const adPurchases = await ctx.db
      .query("adPurchases")
      .withIndex("by_purchaseId", (q) => q.eq("purchaseId", purchase._id))
      .collect();

    const adPurchasesWithDetails = await Promise.all(
      adPurchases.map(async (ap) => {
        const ad = await ctx.db.get(ap.advertisementId);
        const edition = ap.calendarEditionId
          ? await ctx.db.get(ap.calendarEditionId)
          : null;
        const slots = await ctx.db
          .query("adSlots")
          .withIndex("by_adPurchaseId", (q) =>
            q.eq("adPurchaseId", ap._id)
          )
          .collect();
        return {
          ...ap,
          advertisementName: ad?.name ?? "Unknown",
          isDayType: ad?.isDayType ?? false,
          slotsPerMonth: ad?.slotsPerMonth ?? 0,
          editionName: edition?.name ?? "Unknown",
          slots,
        };
      })
    );

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

    const paymentsWithAllocations = await Promise.all(
      payments.map(async (payment) => {
        const paymentAllocs = await ctx.db
          .query("paymentAllocations")
          .withIndex("by_paymentId", (q) =>
            q.eq("paymentId", payment._id)
          )
          .collect();
        return { ...payment, allocations: paymentAllocs };
      })
    );

    const now = Date.now();
    const net = terms
      ? computeNet(terms, scheduledPayments, allAllocations, now)
      : 0;
    const amountPaid = computeAmountPaid(allAllocations);
    const isPaid = computeIsPaid(net, amountPaid);
    const lateFees = terms
      ? computeLateFees(terms, scheduledPayments, allAllocations, now)
      : 0;

    const enrichedScheduledPayments = scheduledPayments
      .sort((a, b) => a.dueDate - b.dueDate)
      .map((sp) => ({
        ...sp,
        paidAmount: computeScheduledPaymentPaid(sp._id, allAllocations),
        isLate: isScheduledPaymentLate(sp, allAllocations, now),
      }));

    return {
      ...purchase,
      contact,
      editions,
      terms,
      adPurchases: adPurchasesWithDetails,
      scheduledPayments: enrichedScheduledPayments,
      payments: paymentsWithAllocations,
      net,
      amountPaid,
      isPaid,
      lateFees,
    };
  },
});

export const listByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const enriched = await Promise.all(
      purchases.map(async (purchase) => {
        const editionNames = await getEditionNames(
          ctx,
          purchase.calendarEditionIds
        );

        const terms = await ctx.db
          .query("paymentTerms")
          .withIndex("by_purchaseId", (q) =>
            q.eq("purchaseId", purchase._id)
          )
          .first();

        const scheduledPayments = await ctx.db
          .query("scheduledPayments")
          .withIndex("by_purchaseId", (q) =>
            q.eq("purchaseId", purchase._id)
          )
          .collect();

        const allAllocations = [];
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
          ? computeNet(terms, scheduledPayments, allAllocations)
          : 0;
        const amountPaid = computeAmountPaid(allAllocations);
        const isPaid = computeIsPaid(net, amountPaid);

        return {
          ...purchase,
          editionName: editionNames.join(", ") || "Unknown",
          net,
          amountPaid,
          isPaid,
        };
      })
    );

    return enriched;
  },
});
