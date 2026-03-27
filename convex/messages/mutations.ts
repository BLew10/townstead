import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const send = mutation({
  args: {
    contactId: v.id("contacts"),
    content: v.string(),
    senderRole: v.union(v.literal("admin"), v.literal("client")),
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

    return await ctx.db.insert("messages", {
      contactId: args.contactId,
      content: args.content,
      senderRole: args.senderRole,
      orgId,
      createdAt: Date.now(),
    });
  },
});
