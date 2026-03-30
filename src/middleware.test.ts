import { describe, it, expect } from "vitest";

const RESERVED_SEGMENTS = new Set([
  "events", "directory", "coupons", "blog", "videos", "profile",
  "admin", "portal", "auth", "api", "_next", "c",
]);

function matchCommunityUrl(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const orgSlug = segments[0];
  if (!orgSlug || RESERVED_SEGMENTS.has(orgSlug)) return null;

  // Old /c/ format → redirect target
  if (segments[1] === "c" && segments[2]) {
    const communitySlug = segments[2];
    const rest = segments.slice(3).join("/");
    return {
      type: "redirect" as const,
      orgSlug,
      communitySlug,
      redirectPath: `/${orgSlug}/${communitySlug}${rest ? `/${rest}` : ""}`,
    };
  }

  if (segments.length < 2 || RESERVED_SEGMENTS.has(segments[1])) return null;

  const communitySlug = segments[1];
  const rest = segments.slice(2).join("/");
  return {
    type: "rewrite" as const,
    orgSlug,
    communitySlug,
    rewritePath: `/${orgSlug}${rest ? `/${rest}` : ""}`,
  };
}

describe("community URL pattern (no /c/ prefix)", () => {
  it("matches /org/community", () => {
    const result = matchCommunityUrl("/sacramento-hub/downtown");
    expect(result).toEqual({
      type: "rewrite",
      orgSlug: "sacramento-hub",
      communitySlug: "downtown",
      rewritePath: "/sacramento-hub",
    });
  });

  it("matches /org/community/events", () => {
    const result = matchCommunityUrl("/sacramento-hub/downtown/events");
    expect(result).toEqual({
      type: "rewrite",
      orgSlug: "sacramento-hub",
      communitySlug: "downtown",
      rewritePath: "/sacramento-hub/events",
    });
  });

  it("matches /org/community/events/abc123", () => {
    const result = matchCommunityUrl("/org/midtown/events/abc123");
    expect(result).toEqual({
      type: "rewrite",
      orgSlug: "org",
      communitySlug: "midtown",
      rewritePath: "/org/events/abc123",
    });
  });

  it("matches /org/community/blog/my-post", () => {
    const result = matchCommunityUrl("/org/east-side/blog/my-post");
    expect(result).toEqual({
      type: "rewrite",
      orgSlug: "org",
      communitySlug: "east-side",
      rewritePath: "/org/blog/my-post",
    });
  });

  it("does not match reserved second segments", () => {
    expect(matchCommunityUrl("/org/events")).toBeNull();
    expect(matchCommunityUrl("/org/blog")).toBeNull();
    expect(matchCommunityUrl("/org/directory")).toBeNull();
    expect(matchCommunityUrl("/org/coupons")).toBeNull();
    expect(matchCommunityUrl("/org/videos")).toBeNull();
    expect(matchCommunityUrl("/org/profile")).toBeNull();
  });

  it("does not match org-only paths", () => {
    expect(matchCommunityUrl("/org")).toBeNull();
  });

  it("rejects reserved first segments (admin, portal, api, auth)", () => {
    expect(matchCommunityUrl("/admin/downtown")).toBeNull();
    expect(matchCommunityUrl("/portal/downtown")).toBeNull();
    expect(matchCommunityUrl("/api/downtown")).toBeNull();
    expect(matchCommunityUrl("/auth/downtown")).toBeNull();
    expect(matchCommunityUrl("/_next/downtown")).toBeNull();
  });
});

describe("old /c/ URL backward compat", () => {
  it("produces redirect for /org/c/community", () => {
    const result = matchCommunityUrl("/org/c/downtown");
    expect(result).toEqual({
      type: "redirect",
      orgSlug: "org",
      communitySlug: "downtown",
      redirectPath: "/org/downtown",
    });
  });

  it("produces redirect for /org/c/community/events", () => {
    const result = matchCommunityUrl("/org/c/downtown/events");
    expect(result).toEqual({
      type: "redirect",
      orgSlug: "org",
      communitySlug: "downtown",
      redirectPath: "/org/downtown/events",
    });
  });

  it("produces redirect for deep /c/ paths", () => {
    const result = matchCommunityUrl("/org/c/midtown/blog/my-post");
    expect(result).toEqual({
      type: "redirect",
      orgSlug: "org",
      communitySlug: "midtown",
      redirectPath: "/org/midtown/blog/my-post",
    });
  });
});
