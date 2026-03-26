/**
 * Shared TypeScript types mirroring the Convex schema.
 *
 * Once `npx convex dev` has been run and `convex/_generated/` exists,
 * these can be replaced with `Doc<"tableName">` and `Id<"tableName">`
 * imports from "convex/_generated/dataModel" for full type safety.
 */

// Address embedded type
export type Address = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
};

// Monthly prices object
export type MonthlyPrices = {
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
};

// Payment method options
export type PaymentMethod = "check" | "credit_card" | "cash" | "other";

// Delivery method options
export type DeliveryMethod = "mail" | "email" | "pickup";

// Discount/fee type
export type AdjustmentType = "flat" | "percent";

// Ad placement position
export type PlacementPosition = "top" | "bottom";
