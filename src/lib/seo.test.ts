import { describe, it, expect } from "vitest";
import { createJsonLd, buildOpenGraph, truncate } from "./seo";

describe("createJsonLd", () => {
  it("includes schema.org context", () => {
    const result = createJsonLd("Event", { name: "Town Fair" });
    const parsed = JSON.parse(result.__html);
    expect(parsed["@context"]).toBe("https://schema.org");
  });

  it("sets the correct @type", () => {
    const result = createJsonLd("LocalBusiness", {});
    const parsed = JSON.parse(result.__html);
    expect(parsed["@type"]).toBe("LocalBusiness");
  });

  it("spreads data properties", () => {
    const result = createJsonLd("Event", {
      name: "Fair",
      startDate: "2026-07-04",
    });
    const parsed = JSON.parse(result.__html);
    expect(parsed.name).toBe("Fair");
    expect(parsed.startDate).toBe("2026-07-04");
  });

  it("returns an object with __html key for dangerouslySetInnerHTML", () => {
    const result = createJsonLd("Thing", {});
    expect(result).toHaveProperty("__html");
    expect(typeof result.__html).toBe("string");
  });
});

describe("buildOpenGraph", () => {
  it("includes title and defaults type to website", () => {
    const og = buildOpenGraph({ title: "My Site" });
    expect(og).toMatchObject({ title: "My Site", type: "website" });
  });

  it("includes description when provided", () => {
    const og = buildOpenGraph({
      title: "My Site",
      description: "A great site",
    });
    expect(og).toMatchObject({ description: "A great site" });
  });

  it("excludes description when not provided", () => {
    const og = buildOpenGraph({ title: "My Site" });
    expect(og).not.toHaveProperty("description");
  });

  it("sets type to article when specified", () => {
    const og = buildOpenGraph({ title: "Post", type: "article" });
    expect(og).toMatchObject({ type: "article" });
  });

  it("includes url when provided", () => {
    const og = buildOpenGraph({
      title: "My Site",
      url: "https://example.com",
    });
    expect(og).toMatchObject({ url: "https://example.com" });
  });

  it("excludes url when not provided", () => {
    const og = buildOpenGraph({ title: "My Site" });
    expect(og).not.toHaveProperty("url");
  });

  it("includes images array when imageUrl provided", () => {
    const og = buildOpenGraph({
      title: "My Site",
      imageUrl: "https://example.com/img.jpg",
    });
    expect(og).toMatchObject({
      images: [{ url: "https://example.com/img.jpg" }],
    });
  });

  it("excludes images when imageUrl not provided", () => {
    const og = buildOpenGraph({ title: "My Site" });
    expect(og).not.toHaveProperty("images");
  });
});

describe("truncate", () => {
  it("returns text unchanged when within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns text unchanged when exactly at limit", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates and adds ellipsis when over limit", () => {
    const result = truncate("hello world", 6);
    expect(result.length).toBeLessThanOrEqual(6);
    expect(result).toContain("\u2026");
  });

  it("trims trailing whitespace before ellipsis", () => {
    const result = truncate("hello world foo", 7);
    expect(result).not.toMatch(/\s\u2026$/);
    expect(result.endsWith("\u2026")).toBe(true);
  });

  it("handles single character limit", () => {
    const result = truncate("hello", 1);
    expect(result).toBe("\u2026");
  });

  it("handles empty string", () => {
    expect(truncate("", 10)).toBe("");
  });
});
