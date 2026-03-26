import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(timestamp: number): string {
  return format(new Date(timestamp), "MMM d, yyyy");
}

export function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp), "MMM d, yyyy h:mm a");
}
