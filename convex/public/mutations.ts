import { mutation, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { requirePublicAuth, requirePermission, requireCreateAction } from "../auth.helpers";
import { PERMISSIONS } from "../permissions";

async function resolveOrg(ctx: MutationCtx, orgSlug: string): Promise<Doc<"tenantBranding">> {
  const branding = await ctx.db
    .query("tenantBranding")
    .withIndex("by_orgSlug", (q) => q.eq("orgSlug", orgSlug))
    .unique();
  if (!branding) throw new Error("Organization not found");
  return branding;
}

export const submitEvent = mutation({
  args: {
    orgSlug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    date: v.number(),
    endDate: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    communityIds: v.optional(v.array(v.id("communities"))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requirePublicAuth(ctx);
    const branding = await resolveOrg(ctx, args.orgSlug);

    const { needsApproval } = await requireCreateAction(
      ctx,
      userId,
      branding.orgId,
      "events"
    );

    return await ctx.db.insert("events", {
      name: args.name,
      description: args.description,
      date: args.date,
      endDate: args.endDate,
      startTime: args.startTime,
      endTime: args.endTime,
      location: args.location,
      categoryId: args.categoryId,
      communityIds: args.communityIds,
      submittedBy: userId,
      isApproved: !needsApproval,
      orgId: branding.orgId,
      isDeleted: false,
    });
  },
});

export const claimCoupon = mutation({
  args: {
    couponId: v.id("coupons"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requirePublicAuth(ctx);

    const coupon = await ctx.db.get(args.couponId);
    if (!coupon || coupon.isDeleted === true) {
      throw new Error("Coupon not found");
    }

    await requirePermission(
      ctx,
      userId,
      coupon.orgId,
      PERMISSIONS.COUPONS_CLAIM
    );

    if (coupon.endDate < Date.now()) {
      throw new Error("Coupon has expired");
    }

    const existingClaim = await ctx.db
      .query("couponClaims")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("couponId"), args.couponId))
      .unique();

    if (existingClaim) {
      throw new Error("Coupon already claimed");
    }

    if (coupon.quantityLimit !== undefined) {
      const claimCount = await ctx.db
        .query("couponClaims")
        .withIndex("by_couponId", (q) => q.eq("couponId", args.couponId))
        .collect();

      if (claimCount.length >= coupon.quantityLimit) {
        throw new Error("Coupon claim limit reached");
      }
    }

    return await ctx.db.insert("couponClaims", {
      couponId: args.couponId,
      userId,
      claimedAt: Date.now(),
    });
  },
});
