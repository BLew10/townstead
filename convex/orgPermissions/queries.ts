import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../auth.helpers";

export const getMyGrant = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("orgPermissions")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) =>
        q.and(
          q.eq(q.field("role"), "contact"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();
  },
});

export const getForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    return await ctx.db
      .query("orgPermissions")
      .withIndex("by_userId_and_orgId", (q) =>
        q.eq("userId", args.userId).eq("orgId", orgId)
      )
      .first();
  },
});

export const getForContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const orgId = identity.orgId as string | undefined;
    if (!orgId) return null;

    const grant = await ctx.db
      .query("orgPermissions")
      .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
      .first();

    if (grant && grant.orgId !== orgId) return null;
    return grant;
  },
});

export const listByOrg = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireAuth(ctx);

    return await ctx.db
      .query("orgPermissions")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();
  },
});

export const getDefaults = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireAuth(ctx);

    return await ctx.db
      .query("orgPermissionDefaults")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first();
  },
});
