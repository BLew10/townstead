import { query } from "../_generated/server";
import { v } from "convex/values";

export const listByAdvertisement = query({
  args: { advertisementId: v.id("advertisements") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adPricing")
      .withIndex("by_advertisementId", (q) =>
        q.eq("advertisementId", args.advertisementId)
      )
      .collect();
  },
});

export const getByAdEditionYear = query({
  args: {
    advertisementId: v.id("advertisements"),
    calendarEditionId: v.id("calendarEditions"),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adPricing")
      .withIndex("by_advertisementId_and_calendarEditionId_and_year", (q) =>
        q
          .eq("advertisementId", args.advertisementId)
          .eq("calendarEditionId", args.calendarEditionId)
          .eq("year", args.year)
      )
      .first();
  },
});
