import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
  computeNet,
  computeAmountPaid,
  isScheduledPaymentLate,
} from "../billing/helpers";

export const recomputeStatsCache = internalMutation({
  args: {
    orgId: v.string(),
    calendarEditionId: v.id("calendarEditions"),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const allPurchases = await ctx.db
      .query("purchases")
      .withIndex("by_orgId_and_year", (q) =>
        q.eq("orgId", args.orgId).eq("year", args.year)
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const editionPurchases = allPurchases.filter((p) =>
      p.calendarEditionIds.includes(args.calendarEditionId)
    );

    let totalRevenue = 0;
    let totalAmountPaid = 0;
    let latePaymentsCount = 0;

    for (const purchase of editionPurchases) {
      const terms = await ctx.db
        .query("paymentTerms")
        .withIndex("by_purchaseId", (q) =>
          q.eq("purchaseId", purchase._id)
        )
        .first();

      if (!terms) continue;

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

      const net = computeNet(terms, scheduledPayments, allAllocations, now);
      const amountPaid = computeAmountPaid(allAllocations);

      totalRevenue += net;
      totalAmountPaid += amountPaid;

      for (const sp of scheduledPayments) {
        if (isScheduledPaymentLate(sp, allAllocations, now)) {
          latePaymentsCount++;
        }
      }
    }

    const existing = await ctx.db
      .query("dashboardStatsCache")
      .withIndex("by_org_edition_year", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("calendarEditionId", args.calendarEditionId)
          .eq("year", args.year)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalRevenue,
        totalAmountPaid,
        latePaymentsCount,
        computedAt: now,
      });
    } else {
      await ctx.db.insert("dashboardStatsCache", {
        orgId: args.orgId,
        calendarEditionId: args.calendarEditionId,
        year: args.year,
        totalRevenue,
        totalAmountPaid,
        latePaymentsCount,
        computedAt: now,
      });
    }
  },
});
