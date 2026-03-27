import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("layouts", {
      name: args.name,
      orgId: args.orgId,
      isDeleted: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("layouts"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { name: args.name });
  },
});

export const softDelete = mutation({
  args: { id: v.id("layouts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isDeleted: true });
  },
});
