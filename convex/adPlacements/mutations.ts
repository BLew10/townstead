import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    orgId: v.string(),
    layoutId: v.id("layouts"),
    advertisementId: v.id("advertisements"),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    position: v.optional(v.union(v.literal("top"), v.literal("bottom"))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("adPlacements", {
      layoutId: args.layoutId,
      advertisementId: args.advertisementId,
      x: args.x,
      y: args.y,
      width: args.width,
      height: args.height,
      position: args.position,
      orgId: args.orgId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("adPlacements"),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    position: v.optional(v.union(v.literal("top"), v.literal("bottom"))),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      x: args.x,
      y: args.y,
      width: args.width,
      height: args.height,
      position: args.position,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("adPlacements") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
