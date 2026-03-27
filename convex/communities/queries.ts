import { query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("communities")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("communities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBySlug = query({
  args: { orgId: v.string(), slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("communities")
      .withIndex("by_orgId_and_slug", (q) =>
        q.eq("orgId", args.orgId).eq("slug", args.slug)
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .unique();
  },
});
