import { query } from "../_generated/server";
import { v } from "convex/values";
import {
  computeNet,
  computeAmountPaid,
  computeIsPaid,
  computeScheduledPaymentPaid,
  isScheduledPaymentLate,
} from "../billing/helpers";

async function resolvePortalContact(ctx: { auth: any; db: any }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const link = await ctx.db
    .query("clientLinks")
    .withIndex("by_userId", (q: any) => q.eq("userId", identity.subject))
    .first();
  if (!link) throw new Error("No client link found");

  return { contactId: link.contactId, orgId: link.orgId };
}

export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const { contactId, orgId } = await resolvePortalContact(ctx);
    const now = Date.now();

    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_contactId", (q) => q.eq("contactId", contactId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    let totalOutstanding = 0;
    let activeAdsCount = 0;
    const upcomingPayments: {
      dueDate: number;
      amount: number;
      remaining: number;
      purchaseInvoice: string | null;
    }[] = [];

    for (const purchase of purchases) {
      activeAdsCount++;

      const terms = await ctx.db
        .query("paymentTerms")
        .withIndex("by_purchaseId", (q) => q.eq("purchaseId", purchase._id))
        .first();
      if (!terms) continue;

      const scheduledPayments = await ctx.db
        .query("scheduledPayments")
        .withIndex("by_purchaseId", (q) => q.eq("purchaseId", purchase._id))
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

      const net = computeNet(terms, scheduledPayments, allAllocations);
      const amountPaid = computeAmountPaid(allAllocations);
      totalOutstanding += Math.max(0, net - amountPaid);

      for (const sp of scheduledPayments) {
        const paid = computeScheduledPaymentPaid(sp._id, allAllocations);
        const remaining = sp.amount - paid;
        if (remaining > 0 && sp.dueDate >= now) {
          upcomingPayments.push({
            dueDate: sp.dueDate,
            amount: sp.amount,
            remaining,
            purchaseInvoice: purchase.invoiceNumber ?? null,
          });
        }
      }
    }

    upcomingPayments.sort((a, b) => a.dueDate - b.dueDate);

    return {
      activeAdsCount,
      totalOutstanding,
      upcomingPayments: upcomingPayments.slice(0, 5),
    };
  },
});

export const getMyPurchases = query({
  args: {},
  handler: async (ctx) => {
    const { contactId } = await resolvePortalContact(ctx);

    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_contactId", (q) => q.eq("contactId", contactId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    return await Promise.all(
      purchases.map(async (purchase) => {
        const editions = await Promise.all(
          purchase.calendarEditionIds.map((id) => ctx.db.get(id))
        );

        const adPurchases = await ctx.db
          .query("adPurchases")
          .withIndex("by_purchaseId", (q) =>
            q.eq("purchaseId", purchase._id)
          )
          .collect();

        const adDetails = await Promise.all(
          adPurchases.map(async (ap) => {
            const ad = await ctx.db.get(ap.advertisementId);
            return { ...ap, adName: ad?.name ?? "Unknown" };
          })
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
          editionNames: editions
            .filter(Boolean)
            .map((e) => e!.name)
            .join(", "),
          adDetails,
          net,
          amountPaid,
          isPaid,
        };
      })
    );
  },
});

export const getPaymentHistory = query({
  args: { year: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { contactId } = await resolvePortalContact(ctx);

    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_contactId", (q) => q.eq("contactId", contactId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    if (args.year) {
      const filtered = purchases.filter((p) => p.year === args.year);
      return await collectPayments(ctx, filtered);
    }

    return await collectPayments(ctx, purchases);
  },
});

async function collectPayments(
  ctx: { db: any },
  purchases: any[]
) {
  const payments = [];

  for (const purchase of purchases) {
    const pPayments = await ctx.db
      .query("payments")
      .withIndex("by_purchaseId", (q: any) =>
        q.eq("purchaseId", purchase._id)
      )
      .collect();

    const editions = await Promise.all(
      purchase.calendarEditionIds.map((id: any) => ctx.db.get(id))
    );
    const editionName = editions
      .filter(Boolean)
      .map((e: any) => e.name)
      .join(", ");

    for (const payment of pPayments) {
      payments.push({
        ...payment,
        invoiceNumber: purchase.invoiceNumber,
        editionName,
        year: purchase.year,
      });
    }
  }

  return payments.sort(
    (a: any, b: any) => (b.date as number) - (a.date as number)
  );
}

export const getInvoices = query({
  args: {},
  handler: async (ctx) => {
    const { contactId } = await resolvePortalContact(ctx);

    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_contactId", (q) => q.eq("contactId", contactId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    return await Promise.all(
      purchases.map(async (purchase) => {
        const editions = await Promise.all(
          purchase.calendarEditionIds.map((id) => ctx.db.get(id))
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

        return {
          _id: purchase._id,
          invoiceNumber: purchase.invoiceNumber,
          year: purchase.year,
          editionName: editions
            .filter(Boolean)
            .map((e) => e!.name)
            .join(", "),
          net,
          amountPaid,
          isPaid: computeIsPaid(net, amountPaid),
        };
      })
    );
  },
});

export const getMyAssets = query({
  args: {},
  handler: async (ctx) => {
    const { contactId } = await resolvePortalContact(ctx);

    return await ctx.db
      .query("clientAssets")
      .withIndex("by_contactId", (q) => q.eq("contactId", contactId))
      .collect();
  },
});

export const getMyMessages = query({
  args: {},
  handler: async (ctx) => {
    const { contactId } = await resolvePortalContact(ctx);

    return await ctx.db
      .query("messages")
      .withIndex("by_contactId_and_createdAt", (q) =>
        q.eq("contactId", contactId)
      )
      .collect();
  },
});
