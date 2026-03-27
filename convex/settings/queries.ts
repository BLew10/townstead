import { query } from "../_generated/server";
import { v } from "convex/values";

export const getOrgSettings = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orgSettings")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .first();
  },
});
