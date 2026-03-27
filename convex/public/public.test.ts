import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("public", () => {
  it("getHomepageData returns null for unknown orgSlug", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.public.queries.getHomepageData, {
      orgSlug: "nonexistent",
    });
    expect(result).toBeNull();
  });

  it("getHomepageData returns branding and content for valid slug", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("tenantBranding", {
        orgId: "org_1",
        orgSlug: "test-community",
        siteName: "Test Community",
      });
    });

    const result = await t.query(api.public.queries.getHomepageData, {
      orgSlug: "test-community",
    });
    expect(result).not.toBeNull();
    expect(result!.branding.siteName).toBe("Test Community");
    expect(result!.featuredEvents).toHaveLength(0);
    expect(result!.featuredBusinesses).toHaveLength(0);
  });

  it("tenant isolation — listEvents returns empty for unknown slug", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.public.queries.listEvents, {
      orgSlug: "no-such-org",
    });
    expect(result).toHaveLength(0);
  });

  it("listEvents returns approved, non-deleted events for a valid slug", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("tenantBranding", {
        orgId: "org_1",
        orgSlug: "events-org",
        siteName: "Events Org",
      });
      await ctx.db.insert("events", {
        name: "Active Event",
        date: Date.now() + 100000000,
        orgId: "org_1",
        isDeleted: false,
        isApproved: true,
      });
      await ctx.db.insert("events", {
        name: "Deleted Event",
        date: Date.now() + 100000000,
        orgId: "org_1",
        isDeleted: true,
        isApproved: true,
      });
      await ctx.db.insert("events", {
        name: "Rejected Event",
        date: Date.now() + 100000000,
        orgId: "org_1",
        isDeleted: false,
        isApproved: false,
      });
    });

    const events = await t.query(api.public.queries.listEvents, {
      orgSlug: "events-org",
    });
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe("Active Event");
  });

  it("submitEvent creates a pending event via orgSlug", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("tenantBranding", {
        orgId: "org_1",
        orgSlug: "submit-org",
        siteName: "Submit Org",
      });
    });

    const eventId = await t.mutation(api.public.mutations.submitEvent, {
      orgSlug: "submit-org",
      name: "Community Meetup",
      date: 1800000000000,
      submittedBy: "user_abc",
    });
    expect(eventId).toBeTruthy();

    const doc = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(doc!.name).toBe("Community Meetup");
    expect(doc!.isApproved).toBe(false);
    expect(doc!.orgId).toBe("org_1");
  });

  it("claimCoupon creates a claim and rejects duplicate", async () => {
    const t = convexTest(schema, modules);

    const couponId = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Biz",
        firstName: "A",
        lastName: "B",
        orgId: "org_1",
      });
      return await ctx.db.insert("coupons", {
        businessContactId: contactId,
        title: "20% Off",
        startDate: Date.now() - 100000000,
        endDate: Date.now() + 100000000,
        orgId: "org_1",
        isDeleted: false,
      });
    });

    const claimId = await t.mutation(api.public.mutations.claimCoupon, {
      couponId,
      userId: "user_claimer",
    });
    expect(claimId).toBeTruthy();

    await expect(
      t.mutation(api.public.mutations.claimCoupon, {
        couponId,
        userId: "user_claimer",
      })
    ).rejects.toThrowError("already claimed");
  });

  it("claimCoupon rejects expired coupon", async () => {
    const t = convexTest(schema, modules);

    const couponId = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Biz",
        firstName: "A",
        lastName: "B",
        orgId: "org_1",
      });
      return await ctx.db.insert("coupons", {
        businessContactId: contactId,
        title: "Old Deal",
        startDate: 1000000000000,
        endDate: 1000000001000,
        orgId: "org_1",
        isDeleted: false,
      });
    });

    await expect(
      t.mutation(api.public.mutations.claimCoupon, {
        couponId,
        userId: "user_late",
      })
    ).rejects.toThrowError("expired");
  });

  it("listBlogPosts returns published non-deleted posts", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("tenantBranding", {
        orgId: "org_1",
        orgSlug: "blog-org",
        siteName: "Blog Org",
      });
      await ctx.db.insert("blogPosts", {
        title: "Published Post",
        slug: "published",
        content: "Content here",
        status: "published",
        orgId: "org_1",
        isDeleted: false,
      });
      await ctx.db.insert("blogPosts", {
        title: "Draft Post",
        slug: "draft",
        content: "Not ready",
        status: "draft",
        orgId: "org_1",
        isDeleted: false,
      });
      await ctx.db.insert("blogPosts", {
        title: "Deleted Post",
        slug: "deleted",
        content: "Gone",
        status: "published",
        orgId: "org_1",
        isDeleted: true,
      });
    });

    const posts = await t.query(api.public.queries.listBlogPosts, {
      orgSlug: "blog-org",
    });
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("Published Post");
  });
});
