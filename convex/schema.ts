import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  calendarEditions: defineTable({
    name: v.string(),
    code: v.string(),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_code", ["orgId", "code"]),

  advertisements: defineTable({
    name: v.string(),
    isDayType: v.boolean(),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
  }).index("by_orgId", ["orgId"]),

  adPricing: defineTable({
    advertisementId: v.id("advertisements"),
    calendarEditionId: v.id("calendarEditions"),
    year: v.number(),
    monthlyPrices: v.object({
      jan: v.number(),
      feb: v.number(),
      mar: v.number(),
      apr: v.number(),
      may: v.number(),
      jun: v.number(),
      jul: v.number(),
      aug: v.number(),
      sep: v.number(),
      oct: v.number(),
      nov: v.number(),
      dec: v.number(),
    }),
    orgId: v.string(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_calendarEditionId", ["orgId", "calendarEditionId"])
    .index("by_advertisementId", ["advertisementId"])
    .index("by_advertisementId_and_calendarEditionId_and_year", [
      "advertisementId",
      "calendarEditionId",
      "year",
    ]),

  contacts: defineTable({
    company: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(
      v.object({
        street: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip: v.optional(v.string()),
      })
    ),
    website: v.optional(v.string()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
    addressBookIds: v.optional(v.array(v.id("addressBooks"))),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_email", ["orgId", "email"])
    .searchIndex("search_contacts", {
      searchField: "company",
      filterFields: ["orgId", "isDeleted"],
    }),

  addressBooks: defineTable({
    name: v.string(),
    orgId: v.string(),
  }).index("by_orgId", ["orgId"]),

  purchases: defineTable({
    contactId: v.id("contacts"),
    calendarEditionId: v.id("calendarEditions"),
    year: v.number(),
    invoiceNumber: v.optional(v.string()),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_year", ["orgId", "year"])
    .index("by_orgId_and_calendarEditionId", ["orgId", "calendarEditionId"])
    .index("by_contactId", ["contactId"])
    .index("by_orgId_and_invoiceNumber", ["orgId", "invoiceNumber"]),

  paymentTerms: defineTable({
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
    deliveryMethod: v.optional(v.string()),
    invoiceMessage: v.optional(v.string()),
    statementMessage: v.optional(v.string()),
    orgId: v.string(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_purchaseId", ["purchaseId"]),

  adPurchases: defineTable({
    purchaseId: v.id("purchases"),
    advertisementId: v.id("advertisements"),
    quantity: v.number(),
    orgId: v.string(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_purchaseId", ["purchaseId"])
    .index("by_advertisementId", ["advertisementId"]),

  adSlots: defineTable({
    adPurchaseId: v.id("adPurchases"),
    month: v.number(),
    slotNumber: v.optional(v.number()),
    date: v.optional(v.number()),
    orgId: v.string(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_adPurchaseId", ["adPurchaseId"]),

  scheduledPayments: defineTable({
    purchaseId: v.id("purchases"),
    dueDate: v.number(),
    amount: v.number(),
    month: v.number(),
    year: v.number(),
    lateFeeWaived: v.optional(v.boolean()),
    orgId: v.string(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_purchaseId", ["purchaseId"])
    .index("by_orgId_and_year", ["orgId", "year"])
    .index("by_orgId_and_dueDate", ["orgId", "dueDate"]),

  payments: defineTable({
    purchaseId: v.id("purchases"),
    amount: v.number(),
    date: v.number(),
    method: v.optional(v.string()),
    checkNumber: v.optional(v.string()),
    isPrepaid: v.optional(v.boolean()),
    orgId: v.string(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_purchaseId", ["purchaseId"])
    .index("by_orgId_and_date", ["orgId", "date"]),

  paymentAllocations: defineTable({
    paymentId: v.id("payments"),
    scheduledPaymentId: v.id("scheduledPayments"),
    amount: v.number(),
    orgId: v.string(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_paymentId", ["paymentId"])
    .index("by_scheduledPaymentId", ["scheduledPaymentId"]),

  layouts: defineTable({
    name: v.string(),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
  }).index("by_orgId", ["orgId"]),

  adPlacements: defineTable({
    layoutId: v.id("layouts"),
    advertisementId: v.id("advertisements"),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    position: v.optional(v.union(v.literal("top"), v.literal("bottom"))),
    orgId: v.string(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_layoutId", ["layoutId"]),

  calendarEditionLayouts: defineTable({
    calendarEditionId: v.id("calendarEditions"),
    layoutId: v.id("layouts"),
    year: v.number(),
    orgId: v.string(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_calendarEditionId_and_year", ["calendarEditionId", "year"]),

  events: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    date: v.number(),
    endDate: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isYearly: v.optional(v.boolean()),
    calendarEditionIds: v.optional(v.array(v.id("calendarEditions"))),
    orgId: v.string(),
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_date", ["orgId", "date"]),
});
