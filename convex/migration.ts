import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { allocatePayment } from "./billing/helpers";

type DeleteId = Parameters<MutationCtx["db"]["delete"]>[0];

async function deleteDocs(
  docs: Array<{ _id: DeleteId }>,
  ctx: MutationCtx
) {
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
  return docs.length;
}

export const getOrgDataCounts = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const coupons = await ctx.db
      .query("coupons")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
    let couponClaims = 0;
    for (const coupon of coupons) {
      couponClaims += (
        await ctx.db
          .query("couponClaims")
          .withIndex("by_couponId", (q) => q.eq("couponId", coupon._id))
          .collect()
      ).length;
    }

    return {
      addressBooks: (
        await ctx.db
          .query("addressBooks")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      contacts: (
        await ctx.db
          .query("contacts")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      calendarEditions: (
        await ctx.db
          .query("calendarEditions")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      communities: (
        await ctx.db
          .query("communities")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      advertisements: (
        await ctx.db
          .query("advertisements")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      adPricing: (
        await ctx.db
          .query("adPricing")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      events: (
        await ctx.db
          .query("events")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      purchases: (
        await ctx.db
          .query("purchases")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      paymentTerms: (
        await ctx.db
          .query("paymentTerms")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      adPurchases: (
        await ctx.db
          .query("adPurchases")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      adSlots: (
        await ctx.db
          .query("adSlots")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      scheduledPayments: (
        await ctx.db
          .query("scheduledPayments")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      payments: (
        await ctx.db
          .query("payments")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      paymentAllocations: (
        await ctx.db
          .query("paymentAllocations")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      categories: (
        await ctx.db
          .query("categories")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      coupons: coupons.length,
      couponClaims,
      blogPosts: (
        await ctx.db
          .query("blogPosts")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      videos: (
        await ctx.db
          .query("videos")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      tenantBranding: (
        await ctx.db
          .query("tenantBranding")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      orgSettings: (
        await ctx.db
          .query("orgSettings")
          .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
      dashboardStatsCache: (
        await ctx.db
          .query("dashboardStatsCache")
          .withIndex("by_org_edition_year", (q) => q.eq("orgId", args.orgId))
          .collect()
      ).length,
    };
  },
});

export const insertAddressBook = mutation({
  args: {
    name: v.string(),
    displayLevel: v.optional(v.string()),
    orgId: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert("addressBooks", args),
});

/**
 * Destructive migration helper: clears all org-scoped domain data so the
 * Supabase/planner-app database can be re-imported as the source of truth.
 *
 * Preserves user rows and non-contact org permissions so admins do not lose
 * access to the org after the purge.
 */
export const clearOrgData = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const counts: Record<string, number> = {};

    const coupons = await ctx.db
      .query("coupons")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
    let couponClaims = 0;
    for (const coupon of coupons) {
      couponClaims += await deleteDocs(
        await ctx.db
          .query("couponClaims")
          .withIndex("by_couponId", (q) => q.eq("couponId", coupon._id))
          .collect(),
        ctx
      );
    }
    counts.couponClaims = couponClaims;

    counts.portalInvites = await deleteDocs(
      await ctx.db
        .query("portalInvites")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.clientLinks = await deleteDocs(
      await ctx.db
        .query("clientLinks")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.clientAssets = await deleteDocs(
      await ctx.db
        .query("clientAssets")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );

    const orgPermissions = await ctx.db
      .query("orgPermissions")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
    counts.contactOrgPermissions = await deleteDocs(
      orgPermissions.filter((p) => p.contactId !== undefined),
      ctx
    );

    counts.paymentAllocations = await deleteDocs(
      await ctx.db
        .query("paymentAllocations")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.payments = await deleteDocs(
      await ctx.db
        .query("payments")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.scheduledPayments = await deleteDocs(
      await ctx.db
        .query("scheduledPayments")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.adSlots = await deleteDocs(
      await ctx.db
        .query("adSlots")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.adPurchases = await deleteDocs(
      await ctx.db
        .query("adPurchases")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.paymentTerms = await deleteDocs(
      await ctx.db
        .query("paymentTerms")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.purchases = await deleteDocs(
      await ctx.db
        .query("purchases")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );

    counts.blogPosts = await deleteDocs(
      await ctx.db
        .query("blogPosts")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.videos = await deleteDocs(
      await ctx.db
        .query("videos")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.coupons = await deleteDocs(coupons, ctx);
    counts.events = await deleteDocs(
      await ctx.db
        .query("events")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );

    counts.adPricing = await deleteDocs(
      await ctx.db
        .query("adPricing")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.contacts = await deleteDocs(
      await ctx.db
        .query("contacts")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.addressBooks = await deleteDocs(
      await ctx.db
        .query("addressBooks")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.advertisements = await deleteDocs(
      await ctx.db
        .query("advertisements")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.categories = await deleteDocs(
      await ctx.db
        .query("categories")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.communities = await deleteDocs(
      await ctx.db
        .query("communities")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.calendarEditions = await deleteDocs(
      await ctx.db
        .query("calendarEditions")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );

    counts.tenantBranding = await deleteDocs(
      await ctx.db
        .query("tenantBranding")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.orgPermissionDefaults = await deleteDocs(
      await ctx.db
        .query("orgPermissionDefaults")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.orgSettings = await deleteDocs(
      await ctx.db
        .query("orgSettings")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );
    counts.dashboardStatsCache = await deleteDocs(
      await ctx.db
        .query("dashboardStatsCache")
        .withIndex("by_org_edition_year", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx
    );

    return counts;
  },
});

export const insertContact = mutation({
  args: {
    company: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    salutation: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    cellPhone: v.optional(v.string()),
    fax: v.optional(v.string()),
    altPhone: v.optional(v.string()),
    altContactFirstName: v.optional(v.string()),
    altContactLastName: v.optional(v.string()),
    address: v.optional(
      v.object({
        street: v.optional(v.string()),
        street2: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip: v.optional(v.string()),
        country: v.optional(v.string()),
      })
    ),
    website: v.optional(v.string()),
    category: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    notes: v.optional(v.string()),
    customerSince: v.optional(v.number()),
    addressBookIds: v.optional(v.array(v.id("addressBooks"))),
    searchText: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    logoFileId: v.optional(v.id("_storage")),
    featured: v.optional(v.boolean()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => ctx.db.insert("contacts", args),
});

export const insertCalendarEdition = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => ctx.db.insert("calendarEditions", args),
});

export const insertAdvertisement = mutation({
  args: {
    name: v.string(),
    isDayType: v.boolean(),
    slotsPerMonth: v.number(),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => ctx.db.insert("advertisements", args),
});

export const insertCommunity = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageFileId: v.optional(v.id("_storage")),
    calendarEditionIds: v.array(v.id("calendarEditions")),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => ctx.db.insert("communities", args),
});

export const insertEvent = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    date: v.number(),
    endDate: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isYearly: v.optional(v.boolean()),
    scheduleType: v.optional(
      v.union(
        v.literal("SINGLE_DAY"),
        v.literal("DAILY_RANGE"),
        v.literal("MONTHLY_DAY"),
        v.literal("MONTHLY_ORDINAL_WEEKDAY")
      )
    ),
    startsOn: v.optional(v.number()),
    endsOn: v.optional(v.number()),
    monthlyOrdinal: v.optional(
      v.union(
        v.literal("EVERY"),
        v.literal("EVERY_OTHER"),
        v.literal("SECOND_AND_FOURTH"),
        v.literal("FIRST_THIRD_AND_FIFTH"),
        v.literal("FIRST"),
        v.literal("SECOND"),
        v.literal("THIRD"),
        v.literal("FOURTH"),
        v.literal("LAST")
      )
    ),
    monthlyWeekday: v.optional(
      v.union(
        v.literal("MONDAY"),
        v.literal("TUESDAY"),
        v.literal("WEDNESDAY"),
        v.literal("THURSDAY"),
        v.literal("FRIDAY"),
        v.literal("SATURDAY"),
        v.literal("SUNDAY")
      )
    ),
    monthlyMonthSelector: v.optional(
      v.union(v.literal("EVERY"), v.literal("EVEN"), v.literal("ODD"))
    ),
    calendarEditionIds: v.optional(v.array(v.id("calendarEditions"))),
    location: v.optional(v.string()),
    contactId: v.optional(v.id("contacts")),
    categoryId: v.optional(v.id("categories")),
    imageFileId: v.optional(v.id("_storage")),
    isApproved: v.optional(v.boolean()),
    submittedBy: v.optional(v.string()),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => ctx.db.insert("events", args),
});

export const insertPurchase = mutation({
  args: {
    contactId: v.id("contacts"),
    calendarEditionIds: v.array(v.id("calendarEditions")),
    year: v.number(),
    invoiceNumber: v.optional(v.string()),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
    hasSubmittedArtwork: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => ctx.db.insert("purchases", args),
});

export const insertPaymentTerms = mutation({
  args: {
    purchaseId: v.id("purchases"),
    totalSale: v.number(),
    discount1: v.optional(v.number()),
    discount1Label: v.optional(v.string()),
    discount2: v.optional(v.number()),
    discount2Label: v.optional(v.string()),
    additionalSale1: v.optional(v.number()),
    additionalSale1Label: v.optional(v.string()),
    additionalSale2: v.optional(v.number()),
    additionalSale2Label: v.optional(v.string()),
    trade: v.optional(v.number()),
    earlyDiscountType: v.optional(v.union(v.literal("flat"), v.literal("percent"))),
    earlyDiscountAmount: v.optional(v.number()),
    lateFeeType: v.optional(v.union(v.literal("flat"), v.literal("percent"))),
    lateFeeAmount: v.optional(v.number()),
    dueDayOfMonth: v.optional(v.number()),
    splitEqually: v.optional(v.boolean()),
    scheduleStartMonth: v.optional(v.number()),
    scheduleStartYear: v.optional(v.number()),
    scheduleEndMonth: v.optional(v.number()),
    scheduleEndYear: v.optional(v.number()),
    customSchedule: v.optional(
      v.array(
        v.object({
          month: v.number(),
          year: v.number(),
          amount: v.number(),
        })
      )
    ),
    deliveryMethod: v.optional(v.string()),
    invoiceMessage: v.optional(v.string()),
    statementMessage: v.optional(v.string()),
    orgId: v.string(),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => ctx.db.insert("paymentTerms", args),
});

export const insertAdPurchase = mutation({
  args: {
    purchaseId: v.id("purchases"),
    advertisementId: v.id("advertisements"),
    calendarEditionId: v.id("calendarEditions"),
    quantity: v.number(),
    charge: v.optional(v.number()),
    orgId: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert("adPurchases", args),
});

export const insertAdSlot = mutation({
  args: {
    adPurchaseId: v.id("adPurchases"),
    advertisementId: v.id("advertisements"),
    calendarEditionId: v.id("calendarEditions"),
    year: v.number(),
    month: v.number(),
    slotNumber: v.optional(v.number()),
    date: v.optional(v.number()),
    orgId: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert("adSlots", args),
});

export const insertScheduledPayment = mutation({
  args: {
    purchaseId: v.id("purchases"),
    dueDate: v.number(),
    amount: v.number(),
    month: v.number(),
    year: v.number(),
    lateFeeWaived: v.optional(v.boolean()),
    orgId: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert("scheduledPayments", args),
});

export const insertPayment = mutation({
  args: {
    purchaseId: v.id("purchases"),
    amount: v.number(),
    date: v.number(),
    method: v.optional(v.string()),
    checkNumber: v.optional(v.string()),
    isPrepaid: v.optional(v.boolean()),
    orgId: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert("payments", args),
});

export const insertPaymentAllocation = mutation({
  args: {
    paymentId: v.id("payments"),
    scheduledPaymentId: v.id("scheduledPayments"),
    amount: v.number(),
    orgId: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert("paymentAllocations", args),
});

/**
 * Repair mutation: finds all payments for a purchase that have no
 * paymentAllocations, then runs allocatePayment to create them.
 * Safe to run multiple times — skips payments that already have allocations.
 */
export const repairPaymentAllocations = mutation({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) throw new Error("Purchase not found");

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_purchaseId", (q) => q.eq("purchaseId", args.purchaseId))
      .collect();

    const scheduledPayments = await ctx.db
      .query("scheduledPayments")
      .withIndex("by_purchaseId", (q) => q.eq("purchaseId", args.purchaseId))
      .collect();

    if (scheduledPayments.length === 0) {
      return { repaired: 0, skipped: payments.length, reason: "no scheduled payments" };
    }

    const sortedPayments = [...payments].sort((a, b) => a.date - b.date);

    let repaired = 0;
    let skipped = 0;

    for (const payment of sortedPayments) {
      const existingAllocs = await ctx.db
        .query("paymentAllocations")
        .withIndex("by_paymentId", (q) => q.eq("paymentId", payment._id))
        .collect();

      if (existingAllocs.length > 0) {
        skipped++;
        continue;
      }

      const allAllocations = [];
      for (const sp of scheduledPayments) {
        const spAllocs = await ctx.db
          .query("paymentAllocations")
          .withIndex("by_scheduledPaymentId", (q) =>
            q.eq("scheduledPaymentId", sp._id)
          )
          .collect();
        allAllocations.push(...spAllocs);
      }

      const plan = allocatePayment(payment.amount, scheduledPayments, allAllocations);

      for (const alloc of plan) {
        await ctx.db.insert("paymentAllocations", {
          paymentId: payment._id,
          scheduledPaymentId: alloc.scheduledPaymentId,
          amount: alloc.amount,
          orgId: purchase.orgId,
        });
      }

      repaired++;
    }

    return { repaired, skipped };
  },
});

/**
 * Bulk repair: iterates all payments for an org and creates missing allocations.
 * Returns a summary of how many purchases were affected.
 */
export const repairAllPaymentAllocations = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    let totalRepaired = 0;
    let purchasesFixed = 0;

    for (const purchase of purchases) {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_purchaseId", (q) => q.eq("purchaseId", purchase._id))
        .collect();

      if (payments.length === 0) continue;

      const scheduledPayments = await ctx.db
        .query("scheduledPayments")
        .withIndex("by_purchaseId", (q) => q.eq("purchaseId", purchase._id))
        .collect();

      if (scheduledPayments.length === 0) continue;

      const sortedPayments = [...payments].sort((a, b) => a.date - b.date);
      let purchaseRepaired = false;

      for (const payment of sortedPayments) {
        const existingAllocs = await ctx.db
          .query("paymentAllocations")
          .withIndex("by_paymentId", (q) => q.eq("paymentId", payment._id))
          .collect();

        if (existingAllocs.length > 0) continue;

        const allAllocations = [];
        for (const sp of scheduledPayments) {
          const spAllocs = await ctx.db
            .query("paymentAllocations")
            .withIndex("by_scheduledPaymentId", (q) =>
              q.eq("scheduledPaymentId", sp._id)
            )
            .collect();
          allAllocations.push(...spAllocs);
        }

        const plan = allocatePayment(payment.amount, scheduledPayments, allAllocations);

        for (const alloc of plan) {
          await ctx.db.insert("paymentAllocations", {
            paymentId: payment._id,
            scheduledPaymentId: alloc.scheduledPaymentId,
            amount: alloc.amount,
            orgId: args.orgId,
          });
        }

        totalRepaired++;
        purchaseRepaired = true;
      }

      if (purchaseRepaired) purchasesFixed++;
    }

    return { purchasesFixed, paymentsRepaired: totalRepaired };
  },
});

/**
 * Deletes ALL existing payment allocations for an org and recomputes them
 * from scratch using the v2 allocatePayment logic (earliest-due-first).
 *
 * This fixes data migrated from v1 where allocations may have been
 * assigned to the wrong installment due to a month-only matching bug.
 *
 * Safe to run multiple times — idempotent by design.
 */
export const reallocateAllPayments = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    let allocationsDeleted = 0;
    let allocationsCreated = 0;
    let purchasesProcessed = 0;

    for (const purchase of purchases) {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_purchaseId", (q) => q.eq("purchaseId", purchase._id))
        .collect();

      const scheduledPayments = await ctx.db
        .query("scheduledPayments")
        .withIndex("by_purchaseId", (q) => q.eq("purchaseId", purchase._id))
        .collect();

      if (payments.length === 0 || scheduledPayments.length === 0) continue;

      // Delete all existing allocations for this purchase's scheduled payments
      for (const sp of scheduledPayments) {
        const allocs = await ctx.db
          .query("paymentAllocations")
          .withIndex("by_scheduledPaymentId", (q) =>
            q.eq("scheduledPaymentId", sp._id)
          )
          .collect();
        for (const alloc of allocs) {
          await ctx.db.delete(alloc._id);
          allocationsDeleted++;
        }
      }

      // Re-allocate all payments in date order
      const sortedPayments = [...payments].sort((a, b) => a.date - b.date);

      for (const payment of sortedPayments) {
        // Gather current allocations (from earlier payments in this loop)
        const currentAllocations = [];
        for (const sp of scheduledPayments) {
          const spAllocs = await ctx.db
            .query("paymentAllocations")
            .withIndex("by_scheduledPaymentId", (q) =>
              q.eq("scheduledPaymentId", sp._id)
            )
            .collect();
          currentAllocations.push(...spAllocs);
        }

        const plan = allocatePayment(
          payment.amount,
          scheduledPayments,
          currentAllocations
        );

        for (const alloc of plan) {
          await ctx.db.insert("paymentAllocations", {
            paymentId: payment._id,
            scheduledPaymentId: alloc.scheduledPaymentId,
            amount: alloc.amount,
            orgId: args.orgId,
          });
          allocationsCreated++;
        }
      }

      purchasesProcessed++;
    }

    return { purchasesProcessed, allocationsCreated, allocationsDeleted };
  },
});
