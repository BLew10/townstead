import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, requirePermission } from "../auth.helpers";
import { PERMISSIONS } from "../permissions";

export const create = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    date: v.number(),
    endDate: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isYearly: v.optional(v.boolean()),
    communityIds: v.optional(v.array(v.id("communities"))),
    imageFileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", {
      ...args,
      isApproved: true,
      isDeleted: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    date: v.number(),
    endDate: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isYearly: v.optional(v.boolean()),
    communityIds: v.optional(v.array(v.id("communities"))),
    imageFileId: v.optional(v.id("_storage")),
    isApproved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const approve = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx);
    await requirePermission(ctx, userId, orgId, PERMISSIONS.EVENTS_APPROVE);

    const event = await ctx.db.get(args.id);
    if (!event || event.orgId !== orgId) throw new Error("Not found");

    await ctx.db.patch(args.id, { isApproved: true });
  },
});

export const reject = mutation({
  args: {
    id: v.id("events"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx);
    await requirePermission(ctx, userId, orgId, PERMISSIONS.EVENTS_APPROVE);

    const event = await ctx.db.get(args.id);
    if (!event || event.orgId !== orgId) throw new Error("Not found");

    await ctx.db.patch(args.id, { isDeleted: true });
  },
});

export const softDelete = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isDeleted: true });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
