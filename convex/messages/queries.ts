import { query } from "../_generated/server";
import { v } from "convex/values";

export const listByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("messages")
      .withIndex("by_contactId_and_createdAt", (q) =>
        q.eq("contactId", args.contactId)
      )
      .collect();
  },
});
