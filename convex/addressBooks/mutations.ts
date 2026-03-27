import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    displayLevel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("addressBooks", {
      name: args.name,
      displayLevel: args.displayLevel,
      orgId: args.orgId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("addressBooks"),
    name: v.string(),
    displayLevel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      displayLevel: args.displayLevel,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("addressBooks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
