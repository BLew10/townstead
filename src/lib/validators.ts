import { z } from "zod";

export const calendarEditionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
});

export const advertisementSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isDayType: z.boolean(),
});

export const monthlyPricesSchema = z.object({
  jan: z.number().min(0),
  feb: z.number().min(0),
  mar: z.number().min(0),
  apr: z.number().min(0),
  may: z.number().min(0),
  jun: z.number().min(0),
  jul: z.number().min(0),
  aug: z.number().min(0),
  sep: z.number().min(0),
  oct: z.number().min(0),
  nov: z.number().min(0),
  dec: z.number().min(0),
});

export const adPricingSchema = z.object({
  advertisementId: z.string().min(1, "Advertisement is required"),
  calendarEditionId: z.string().min(1, "Calendar edition is required"),
  year: z.number().int().min(2000).max(2100),
  monthlyPrices: monthlyPricesSchema,
});

export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export const contactSchema = z.object({
  company: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: addressSchema.optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  category: z.string().optional(),
  notes: z.string().optional(),
  addressBookIds: z.array(z.string()).optional(),
});

export const purchaseSchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  calendarEditionId: z.string().min(1, "Calendar edition is required"),
  year: z.number().int().min(2000).max(2100),
});

export const paymentTermsSchema = z.object({
  totalSale: z.number().min(0, "Total sale must be positive"),
  discount1: z.number().min(0).optional(),
  discount1Label: z.string().optional(),
  discount2: z.number().min(0).optional(),
  discount2Label: z.string().optional(),
  additionalSale1: z.number().min(0).optional(),
  additionalSale1Label: z.string().optional(),
  additionalSale2: z.number().min(0).optional(),
  additionalSale2Label: z.string().optional(),
  trade: z.number().min(0).optional(),
  earlyDiscountType: z.enum(["flat", "percent"]).optional(),
  earlyDiscountAmount: z.number().min(0).optional(),
  lateFeeType: z.enum(["flat", "percent"]).optional(),
  lateFeeAmount: z.number().min(0).optional(),
  dueDayOfMonth: z.number().int().min(1).max(31).optional(),
  splitEqually: z.boolean().optional(),
  deliveryMethod: z.string().optional(),
  invoiceMessage: z.string().optional(),
  statementMessage: z.string().optional(),
});

export const paymentSchema = z.object({
  purchaseId: z.string().min(1, "Purchase is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  date: z.number(),
  method: z.string().optional(),
  checkNumber: z.string().optional(),
  isPrepaid: z.boolean().optional(),
});

export const eventSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  date: z.number(),
  endDate: z.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isYearly: z.boolean().optional(),
  calendarEditionIds: z.array(z.string()).optional(),
});

export const layoutSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const adPlacementSchema = z.object({
  layoutId: z.string().min(1, "Layout is required"),
  advertisementId: z.string().min(1, "Advertisement is required"),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(1),
  height: z.number().min(1),
  position: z.enum(["top", "bottom"]).optional(),
});

// Type inference helpers
export type CalendarEditionFormValues = z.infer<typeof calendarEditionSchema>;
export type AdvertisementFormValues = z.infer<typeof advertisementSchema>;
export type ContactFormValues = z.infer<typeof contactSchema>;
export type PurchaseFormValues = z.infer<typeof purchaseSchema>;
export type PaymentTermsFormValues = z.infer<typeof paymentTermsSchema>;
export type PaymentFormValues = z.infer<typeof paymentSchema>;
export type EventFormValues = z.infer<typeof eventSchema>;
export type LayoutFormValues = z.infer<typeof layoutSchema>;
export type AdPlacementFormValues = z.infer<typeof adPlacementSchema>;
