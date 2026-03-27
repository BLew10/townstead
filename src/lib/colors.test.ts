import { describe, it, expect } from "vitest";
import { getContactColor, getContrastText } from "./colors";

describe("getContactColor", () => {
  it("returns a valid HSL string", () => {
    const color = getContactColor("abc123");
    expect(color).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
  });

  it("is deterministic — same ID always returns same color", () => {
    const a = getContactColor("contact_xyz");
    const b = getContactColor("contact_xyz");
    expect(a).toBe(b);
  });

  it("produces different colors for different IDs", () => {
    const a = getContactColor("id_1");
    const b = getContactColor("id_2");
    expect(a).not.toBe(b);
  });

  it("handles empty string", () => {
    const color = getContactColor("");
    expect(color).toMatch(/^hsl\(/);
  });

  it("handles long strings", () => {
    const color = getContactColor("a".repeat(1000));
    expect(color).toMatch(/^hsl\(/);
  });
});

describe("getContrastText", () => {
  it("returns dark text for light backgrounds (lightness > 55)", () => {
    expect(getContrastText("hsl(220, 60%, 60%)")).toBe("#1a1a1a");
  });

  it("returns white text for dark backgrounds (lightness <= 55)", () => {
    expect(getContrastText("hsl(210, 70%, 50%)")).toBe("#ffffff");
  });

  it("returns white text at lightness boundary (55)", () => {
    expect(getContrastText("hsl(0, 0%, 55%)")).toBe("#ffffff");
  });

  it("returns dark text at lightness 56", () => {
    expect(getContrastText("hsl(0, 0%, 56%)")).toBe("#1a1a1a");
  });

  it("returns #fff for invalid HSL string", () => {
    expect(getContrastText("not-a-color")).toBe("#fff");
  });

  it("returns #fff for empty string", () => {
    expect(getContrastText("")).toBe("#fff");
  });

  it("returns #fff for rgb format (not HSL)", () => {
    expect(getContrastText("rgb(255, 0, 0)")).toBe("#fff");
  });
});
