import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    businessContactId: v.optional(v.id("contacts")),
    categoryId: v.optional(v.id("categories")),
    communityIds: v.optional(v.array(v.id("communities"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const orgId = identity.orgId as string;
    if (!orgId) throw new Error("No organization selected");

    return await ctx.db.insert("videos", {
      ...args,
      orgId,
      isDeleted: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("videos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    businessContactId: v.optional(v.id("contacts")),
    categoryId: v.optional(v.id("categories")),
    communityIds: v.optional(v.array(v.id("communities"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const orgId = identity.orgId as string;
    if (!orgId) throw new Error("No organization selected");

    const doc = await ctx.db.get(args.id);
    if (!doc || doc.orgId !== orgId) throw new Error("Not found");

    const { id, ...fields } = args;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

export const softDelete = mutation({
  args: { id: v.id("videos") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const orgId = identity.orgId as string;
    if (!orgId) throw new Error("No organization selected");

    const doc = await ctx.db.get(args.id);
    if (!doc || doc.orgId !== orgId) throw new Error("Not found");

    await ctx.db.patch(args.id, { isDeleted: true });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
