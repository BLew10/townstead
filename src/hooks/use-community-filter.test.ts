import { describe, it, expect } from "vitest";

const RESERVED_SEGMENTS = new Set([
  "events", "directory", "coupons", "blog", "videos", "profile",
  "admin", "portal", "auth", "api", "_next", "c",
]);

function parseCommunitySlug(
  pathname: string,
  orgSlug: string,
): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== orgSlug || segments.length < 2) return undefined;
  return RESERVED_SEGMENTS.has(segments[1]) ? undefined : segments[1];
}

function parseContentPath(pathname: string, orgSlug: string): string {
  const communitySlug = parseCommunitySlug(pathname, orgSlug);
  const prefix = communitySlug
    ? `/${orgSlug}/${communitySlug}`
    : `/${orgSlug}`;
  const rest = pathname.startsWith(prefix)
    ? pathname.slice(prefix.length)
    : "";
  return rest.startsWith("/") ? rest.slice(1) : rest;
}

function buildHref(
  orgSlug: string,
  communitySlug: string | undefined,
  segment: string,
): string {
  const base = communitySlug
    ? `/${orgSlug}/${communitySlug}`
    : `/${orgSlug}`;
  return segment ? `${base}/${segment}` : base;
}

describe("parseCommunitySlug", () => {
  it("returns undefined when second segment is reserved", () => {
    expect(parseCommunitySlug("/org/events", "org")).toBeUndefined();
    expect(parseCommunitySlug("/org/blog", "org")).toBeUndefined();
    expect(parseCommunitySlug("/org/directory", "org")).toBeUndefined();
  });

  it("extracts slug from /org/slug", () => {
    expect(parseCommunitySlug("/org/downtown", "org")).toBe("downtown");
  });

  it("extracts slug from /org/slug/events", () => {
    expect(parseCommunitySlug("/org/downtown/events", "org")).toBe("downtown");
  });

  it("returns undefined for org root", () => {
    expect(parseCommunitySlug("/org", "org")).toBeUndefined();
  });

  it("handles orgSlug with hyphens", () => {
    expect(
      parseCommunitySlug("/sac-hub/east-side/blog", "sac-hub"),
    ).toBe("east-side");
  });

  it("returns undefined when orgSlug doesn't match", () => {
    expect(parseCommunitySlug("/other/downtown", "org")).toBeUndefined();
  });
});

describe("parseContentPath", () => {
  it("returns empty string for org root", () => {
    expect(parseContentPath("/org", "org")).toBe("");
  });

  it("returns segment for reserved path /org/events", () => {
    expect(parseContentPath("/org/events", "org")).toBe("events");
  });

  it("returns segment for /org/slug/events", () => {
    expect(parseContentPath("/org/downtown/events", "org")).toBe("events");
  });

  it("returns nested path for detail pages", () => {
    expect(parseContentPath("/org/downtown/events/abc", "org")).toBe(
      "events/abc",
    );
  });

  it("returns empty for community root /org/slug", () => {
    expect(parseContentPath("/org/downtown", "org")).toBe("");
  });
});

describe("buildHref", () => {
  it("builds org root without community", () => {
    expect(buildHref("org", undefined, "")).toBe("/org");
  });

  it("builds section link without community", () => {
    expect(buildHref("org", undefined, "events")).toBe("/org/events");
  });

  it("builds community root", () => {
    expect(buildHref("org", "downtown", "")).toBe("/org/downtown");
  });

  it("builds section link with community", () => {
    expect(buildHref("org", "downtown", "events")).toBe(
      "/org/downtown/events",
    );
  });

  it("builds detail link with community", () => {
    expect(buildHref("org", "downtown", "events/abc123")).toBe(
      "/org/downtown/events/abc123",
    );
  });
});
