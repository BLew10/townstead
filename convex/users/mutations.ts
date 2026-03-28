import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";

export const upsertUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        avatarUrl: args.avatarUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
    });
  },
});

export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User record not found");

    const updates: Record<string, unknown> = {};
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;

    await ctx.db.patch(user._id, updates);
  },
});
