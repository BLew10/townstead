import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageFileId: v.optional(v.id("_storage")),
    calendarEditionIds: v.array(v.id("calendarEditions")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const orgId = identity.orgId as string;
    if (!orgId) throw new Error("No organization selected");

    const existing = await ctx.db
      .query("communities")
      .withIndex("by_orgId_and_slug", (q) =>
        q.eq("orgId", orgId).eq("slug", args.slug)
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .unique();

    if (existing) throw new Error("A community with this slug already exists");

    return await ctx.db.insert("communities", {
      ...args,
      orgId,
      isDeleted: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("communities"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    imageFileId: v.optional(v.id("_storage")),
    calendarEditionIds: v.optional(v.array(v.id("calendarEditions"))),
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

    if (updates.slug && updates.slug !== doc.slug) {
      const existing = await ctx.db
        .query("communities")
        .withIndex("by_orgId_and_slug", (q) =>
          q.eq("orgId", orgId).eq("slug", updates.slug as string)
        )
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .unique();
      if (existing && existing._id !== id)
        throw new Error("A community with this slug already exists");
    }

    await ctx.db.patch(id, updates);
  },
});

export const softDelete = mutation({
  args: { id: v.id("communities") },
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
