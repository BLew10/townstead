import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const waiveLateFee = mutation({
  args: {
    id: v.id("scheduledPayments"),
    waived: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lateFeeWaived: args.waived });
  },
});
