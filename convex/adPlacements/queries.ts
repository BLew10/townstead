import { query } from "../_generated/server";
import { v } from "convex/values";

export const listByLayout = query({
  args: { layoutId: v.id("layouts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adPlacements")
      .withIndex("by_layoutId", (q) => q.eq("layoutId", args.layoutId))
      .collect();
  },
});
