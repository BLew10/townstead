import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../auth.helpers";

export const send = mutation({
  args: {
    contactId: v.id("contacts"),
    content: v.string(),
    senderRole: v.union(v.literal("admin"), v.literal("client")),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

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
