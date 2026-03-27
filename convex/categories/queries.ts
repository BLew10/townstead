import { query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    orgId: v.string(),
    type: v.optional(
      v.union(
        v.literal("event"),
        v.literal("blog"),
        v.literal("video"),
        v.literal("business")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.type) {
      return await ctx.db
        .query("categories")
        .withIndex("by_orgId_and_type", (q) =>
          q.eq("orgId", args.orgId).eq("type", args.type!)
        )
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();
    }

    return await ctx.db
      .query("categories")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
