import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { allocatePayment } from "./billing/helpers";

export const insertAddressBook = mutation({
  args: {
    name: v.string(),
    displayLevel: v.optional(v.string()),
    orgId: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert("addressBooks", args),
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

export const insertLayout = mutation({
  args: {
    name: v.string(),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => ctx.db.insert("layouts", args),
});

export const insertAdPlacement = mutation({
  args: {
    layoutId: v.id("layouts"),
    advertisementId: v.id("advertisements"),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    position: v.optional(v.union(v.literal("top"), v.literal("bottom"))),
    orgId: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert("adPlacements", args),
});

export const insertCalendarEditionLayout = mutation({
  args: {
    calendarEditionId: v.id("calendarEditions"),
    layoutId: v.id("layouts"),
    year: v.number(),
    orgId: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert("calendarEditionLayouts", args),
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
    communityIds: v.optional(v.array(v.id("communities"))),
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
