import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const waiveLateFee = mutation({
  args: {
    id: v.id("scheduledPayments"),
    waived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const sp = await ctx.db.get(args.id);
    await ctx.db.patch(args.id, { lateFeeWaived: args.waived });

    if (sp) {
      const purchase = await ctx.db.get(sp.purchaseId);
      if (purchase && !purchase.isDeleted) {
        for (const calendarEditionId of purchase.calendarEditionIds) {
          await ctx.scheduler.runAfter(
            0,
            internal.dashboard.mutations.recomputeStatsCache,
            {
              orgId: purchase.orgId,
              calendarEditionId,
              year: purchase.year,
            }
          );
        }
      }
    }
  },
});
