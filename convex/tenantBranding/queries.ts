import { query } from "../_generated/server";
import { v } from "convex/values";

export const getByOrgId = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenantBranding")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .unique();
  },
});

export const getBySlug = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenantBranding")
      .withIndex("by_orgSlug", (q) => q.eq("orgSlug", args.orgSlug))
      .unique();
  },
});
