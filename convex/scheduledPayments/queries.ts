import { query } from "../_generated/server";
import { v } from "convex/values";
import {
  isScheduledPaymentLate,
  computeScheduledPaymentPaid,
} from "../billing/helpers";

export const listByPurchase = query({
  args: { purchaseId: v.id("purchases"), now: v.number() },
  handler: async (ctx, args) => {
    const scheduledPayments = await ctx.db
      .query("scheduledPayments")
      .withIndex("by_purchaseId", (q) =>
        q.eq("purchaseId", args.purchaseId)
      )
      .collect();

    const now = args.now;
    const enriched = await Promise.all(
      scheduledPayments.map(async (sp) => {
        const allocations = await ctx.db
          .query("paymentAllocations")
          .withIndex("by_scheduledPaymentId", (q) =>
            q.eq("scheduledPaymentId", sp._id)
          )
          .collect();

        return {
          ...sp,
          paidAmount: computeScheduledPaymentPaid(sp._id, allocations),
          isLate: isScheduledPaymentLate(sp, allocations, now),
        };
      })
    );

    return enriched.sort((a, b) => a.dueDate - b.dueDate);
  },
});
