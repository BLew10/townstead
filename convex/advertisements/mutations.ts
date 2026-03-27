import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    isDayType: v.boolean(),
    slotsPerMonth: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("advertisements", {
      name: args.name,
      isDayType: args.isDayType,
      slotsPerMonth: args.slotsPerMonth,
      orgId: args.orgId,
      isDeleted: false,
    });
  },
});

export const softDelete = mutation({
  args: { id: v.id("advertisements") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isDeleted: true });
  },
});
