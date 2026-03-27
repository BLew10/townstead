import { query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const search = query({
  args: { orgId: v.string(), searchTerm: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contacts")
      .withSearchIndex("search_contacts", (q) =>
        q.search("searchText", args.searchTerm).eq("orgId", args.orgId)
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
  },
});
