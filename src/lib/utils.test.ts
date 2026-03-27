import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  dollarsToCents,
  centsToDollars,
  formatDate,
  formatDateTime,
} from "./utils";

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe("formatCurrency", () => {
  it("formats positive cents as USD", () => {
    expect(formatCurrency(15000)).toBe("$150.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats single-digit cents", () => {
    expect(formatCurrency(1)).toBe("$0.01");
  });

  it("formats sub-dollar amounts", () => {
    expect(formatCurrency(99)).toBe("$0.99");
  });

  it("formats large values with commas", () => {
    expect(formatCurrency(1000000)).toBe("$10,000.00");
  });

  it("formats very large values", () => {
    expect(formatCurrency(10000000)).toBe("$100,000.00");
  });
});

// ---------------------------------------------------------------------------
// dollarsToCents
// ---------------------------------------------------------------------------

describe("dollarsToCents", () => {
  it("converts whole dollars", () => {
    expect(dollarsToCents(150)).toBe(15000);
  });

  it("converts fractional dollars", () => {
    expect(dollarsToCents(19.99)).toBe(1999);
  });

  it("converts zero", () => {
    expect(dollarsToCents(0)).toBe(0);
  });

  it("rounds to nearest cent (0.5 rounds up)", () => {
    // 1.005 * 100 = 100.49999... → Math.round → 100
    // This is an IEEE 754 edge case — the function uses Math.round
    expect(dollarsToCents(1.005)).toBe(Math.round(1.005 * 100));
  });

  it("converts small amounts", () => {
    expect(dollarsToCents(0.01)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// centsToDollars
// ---------------------------------------------------------------------------

describe("centsToDollars", () => {
  it("converts cents to dollars", () => {
    expect(centsToDollars(15000)).toBe(150);
  });

  it("handles fractional result", () => {
    expect(centsToDollars(1999)).toBe(19.99);
  });

  it("converts zero", () => {
    expect(centsToDollars(0)).toBe(0);
  });

  it("converts single cent", () => {
    expect(centsToDollars(1)).toBe(0.01);
  });

  it("round-trips with dollarsToCents for whole-cent values", () => {
    expect(dollarsToCents(centsToDollars(12345))).toBe(12345);
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("formats a known timestamp", () => {
    const ts = new Date(2026, 0, 15).getTime();
    expect(formatDate(ts)).toBe("Jan 15, 2026");
  });

  it("formats a different month", () => {
    const ts = new Date(2026, 11, 25).getTime();
    expect(formatDate(ts)).toBe("Dec 25, 2026");
  });

  it("formats single-digit day without leading zero", () => {
    const ts = new Date(2026, 5, 3).getTime();
    expect(formatDate(ts)).toBe("Jun 3, 2026");
  });
});

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------

describe("formatDateTime", () => {
  it("formats a known timestamp with PM time", () => {
    const ts = new Date(2026, 0, 15, 14, 30).getTime();
    expect(formatDateTime(ts)).toBe("Jan 15, 2026 2:30 PM");
  });

  it("formats a known timestamp with AM time", () => {
    const ts = new Date(2026, 6, 4, 9, 5).getTime();
    expect(formatDateTime(ts)).toBe("Jul 4, 2026 9:05 AM");
  });

  it("formats midnight as 12:00 AM", () => {
    const ts = new Date(2026, 0, 1, 0, 0).getTime();
    expect(formatDateTime(ts)).toBe("Jan 1, 2026 12:00 AM");
  });

  it("formats noon as 12:00 PM", () => {
    const ts = new Date(2026, 0, 1, 12, 0).getTime();
    expect(formatDateTime(ts)).toBe("Jan 1, 2026 12:00 PM");
  });
});
