import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../auth.helpers";

export const upload = mutation({
  args: {
    contactId: v.id("contacts"),
    purchaseId: v.optional(v.id("purchases")),
    fileId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    return await ctx.db.insert("clientAssets", {
      contactId: args.contactId,
      purchaseId: args.purchaseId,
      fileId: args.fileId,
      fileName: args.fileName,
      status: "uploaded",
      orgId,
    });
  },
});

export const review = mutation({
  args: {
    id: v.id("clientAssets"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const asset = await ctx.db.get(args.id);
    if (!asset || asset.orgId !== orgId) throw new Error("Not found");

    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.feedback !== undefined && { feedback: args.feedback }),
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});
