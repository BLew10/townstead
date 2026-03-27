import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { orgId: v.string(), name: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("calendarEditions")
      .withIndex("by_orgId_and_code", (q) =>
        q.eq("orgId", args.orgId).eq("code", args.code)
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .first();
    if (existing) {
      throw new Error(`A calendar edition with code "${args.code}" already exists`);
    }
    return await ctx.db.insert("calendarEditions", {
      name: args.name,
      code: args.code,
      orgId: args.orgId,
      isDeleted: false,
    });
  },
});

export const update = mutation({
  args: { id: v.id("calendarEditions"), name: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.id);
    if (!current) throw new Error("Calendar edition not found");
    if (args.code !== current.code) {
      const existing = await ctx.db
        .query("calendarEditions")
        .withIndex("by_orgId_and_code", (q) =>
          q.eq("orgId", current.orgId).eq("code", args.code)
        )
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .first();
      if (existing && existing._id !== args.id) {
        throw new Error(`A calendar edition with code "${args.code}" already exists`);
      }
    }
    await ctx.db.patch(args.id, { name: args.name, code: args.code });
  },
});

export const softDelete = mutation({
  args: { id: v.id("calendarEditions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isDeleted: true });
  },
});
