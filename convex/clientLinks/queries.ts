import { query } from "../_generated/server";
import { v } from "convex/values";

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clientLinks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getByContactId = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const orgId = identity.orgId as string;
    if (!orgId) return null;

    const link = await ctx.db
      .query("clientLinks")
      .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
      .first();

    if (link && link.orgId !== orgId) return null;
    return link;
  },
});

export const listByOrg = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const orgId = identity.orgId as string;
    if (!orgId) throw new Error("No organization selected");

    return await ctx.db
      .query("clientLinks")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();
  },
});
