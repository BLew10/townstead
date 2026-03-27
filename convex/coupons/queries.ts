import { query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coupons")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("coupons") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getClaimCount = query({
  args: { couponId: v.id("coupons") },
  handler: async (ctx, args) => {
    const claims = await ctx.db
      .query("couponClaims")
      .withIndex("by_couponId", (q) => q.eq("couponId", args.couponId))
      .collect();
    return claims.length;
  },
});
