import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { allocatePayment } from "../billing/helpers";

async function getAllocationsForPurchase(
  ctx: { db: any },
  purchaseId: any
) {
  const scheduledPayments = await ctx.db
    .query("scheduledPayments")
    .withIndex("by_purchaseId", (q: any) =>
      q.eq("purchaseId", purchaseId)
    )
    .collect();

  const allAllocations = [];
  for (const sp of scheduledPayments) {
    const spAllocs = await ctx.db
      .query("paymentAllocations")
      .withIndex("by_scheduledPaymentId", (q: any) =>
        q.eq("scheduledPaymentId", sp._id)
      )
      .collect();
    allAllocations.push(...spAllocs);
  }

  return { scheduledPayments, allAllocations };
}

export const recordPayment = mutation({
  args: {
    purchaseId: v.id("purchases"),
    amount: v.number(),
    date: v.number(),
    method: v.optional(v.string()),
    checkNumber: v.optional(v.string()),
    isPrepaid: v.optional(v.boolean()),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const paymentId = await ctx.db.insert("payments", {
      purchaseId: args.purchaseId,
      amount: args.amount,
      date: args.date,
      method: args.method,
      checkNumber: args.checkNumber,
      isPrepaid: args.isPrepaid,
      orgId: args.orgId,
    });

    const { scheduledPayments, allAllocations } =
      await getAllocationsForPurchase(ctx, args.purchaseId);

    const plan = allocatePayment(
      args.amount,
      scheduledPayments,
      allAllocations
    );

    for (const alloc of plan) {
      await ctx.db.insert("paymentAllocations", {
        paymentId,
        scheduledPaymentId: alloc.scheduledPaymentId,
        amount: alloc.amount,
        orgId: args.orgId,
      });
    }

    return paymentId;
  },
});

export const updatePayment = mutation({
  args: {
    id: v.id("payments"),
    amount: v.number(),
    date: v.number(),
    method: v.optional(v.string()),
    checkNumber: v.optional(v.string()),
    isPrepaid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.id);
    if (!payment) throw new Error("Payment not found");

    const oldAllocations = await ctx.db
      .query("paymentAllocations")
      .withIndex("by_paymentId", (q) => q.eq("paymentId", args.id))
      .collect();
    for (const alloc of oldAllocations) {
      await ctx.db.delete(alloc._id);
    }

    await ctx.db.patch(args.id, {
      amount: args.amount,
      date: args.date,
      method: args.method,
      checkNumber: args.checkNumber,
      isPrepaid: args.isPrepaid,
    });

    const { scheduledPayments, allAllocations } =
      await getAllocationsForPurchase(ctx, payment.purchaseId);

    const plan = allocatePayment(
      args.amount,
      scheduledPayments,
      allAllocations
    );

    for (const alloc of plan) {
      await ctx.db.insert("paymentAllocations", {
        paymentId: args.id,
        scheduledPaymentId: alloc.scheduledPaymentId,
        amount: alloc.amount,
        orgId: payment.orgId,
      });
    }
  },
});

export const deletePayment = mutation({
  args: { id: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.id);
    if (!payment) throw new Error("Payment not found");

    const allocations = await ctx.db
      .query("paymentAllocations")
      .withIndex("by_paymentId", (q) => q.eq("paymentId", args.id))
      .collect();
    for (const alloc of allocations) {
      await ctx.db.delete(alloc._id);
    }

    await ctx.db.delete(args.id);
  },
});
