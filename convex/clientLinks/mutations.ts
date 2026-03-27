import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.string(),
    contactId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const orgId = identity.orgId as string;
    if (!orgId) throw new Error("No organization selected");

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.orgId !== orgId) {
      throw new Error("Contact not found");
    }

    const existing = await ctx.db
      .query("clientLinks")
      .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
      .first();
    if (existing) {
      throw new Error("This contact already has a linked client account");
    }

    const existingUser = await ctx.db
      .query("clientLinks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (existingUser && existingUser.orgId === orgId) {
      throw new Error("This user ID is already linked to another contact");
    }

    return await ctx.db.insert("clientLinks", {
      userId: args.userId,
      contactId: args.contactId,
      orgId,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("clientLinks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const orgId = identity.orgId as string;

    const link = await ctx.db.get(args.id);
    if (!link || link.orgId !== orgId) throw new Error("Not found");

    await ctx.db.delete(args.id);
  },
});
