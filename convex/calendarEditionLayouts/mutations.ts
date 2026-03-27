import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const assign = mutation({
  args: {
    orgId: v.string(),
    calendarEditionId: v.id("calendarEditions"),
    layoutId: v.id("layouts"),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("calendarEditionLayouts")
      .withIndex("by_calendarEditionId_and_year", (q) =>
        q.eq("calendarEditionId", args.calendarEditionId).eq("year", args.year)
      )
      .collect();

    const duplicate = existing.find(
      (cel) => cel.layoutId === args.layoutId && cel.orgId === args.orgId
    );
    if (duplicate) {
      throw new Error("This layout is already assigned to that edition and year.");
    }

    return await ctx.db.insert("calendarEditionLayouts", {
      calendarEditionId: args.calendarEditionId,
      layoutId: args.layoutId,
      year: args.year,
      orgId: args.orgId,
    });
  },
});

export const unassign = mutation({
  args: { id: v.id("calendarEditionLayouts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
