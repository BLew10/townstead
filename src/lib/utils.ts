import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format integer cents as a dollar string (e.g., 15000 → "$150.00").
 * All monetary values in the DB are stored as integer cents.
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Convert a user-entered dollar value to integer cents. */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Convert integer cents to a dollar value for form display. */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatDate(timestamp: number): string {
  return format(new Date(timestamp), "MMM d, yyyy");
}

export function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp), "MMM d, yyyy h:mm a");
}
