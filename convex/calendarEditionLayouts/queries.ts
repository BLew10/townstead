import { query } from "../_generated/server";
import { v } from "convex/values";

export const listByLayout = query({
  args: { orgId: v.string(), layoutId: v.id("layouts") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("calendarEditionLayouts")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
    return all.filter((cel) => cel.layoutId === args.layoutId);
  },
});
