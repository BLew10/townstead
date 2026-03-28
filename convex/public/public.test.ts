import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { PERMISSIONS } from "../permissions";

describe("public", () => {
  it("getHomepageData returns null for unknown orgSlug", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.public.queries.getHomepageData, {
      orgSlug: "nonexistent",
      now: 1710000000000,
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
      now: 1710000000000,
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

  it("getEvent returns null for unapproved events", async () => {
    const t = convexTest(schema, modules);

    const eventId = await t.run(async (ctx) => {
      return await ctx.db.insert("events", {
        name: "Unapproved",
        date: Date.now() + 100000000,
        orgId: "org_1",
        isDeleted: false,
        isApproved: false,
      });
    });

    const result = await t.query(api.public.queries.getEvent, { id: eventId });
    expect(result).toBeNull();
  });

  it("getEvent returns approved events", async () => {
    const t = convexTest(schema, modules);

    const eventId = await t.run(async (ctx) => {
      return await ctx.db.insert("events", {
        name: "Approved Event",
        date: Date.now() + 100000000,
        orgId: "org_1",
        isDeleted: false,
        isApproved: true,
      });
    });

    const result = await t.query(api.public.queries.getEvent, { id: eventId });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Approved Event");
  });

  it("submitEvent requires authentication", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("tenantBranding", {
        orgId: "org_1",
        orgSlug: "submit-org",
        siteName: "Submit Org",
      });
    });

    await expect(
      t.mutation(api.public.mutations.submitEvent, {
        orgSlug: "submit-org",
        name: "Anon Event",
        date: 1800000000000,
      })
    ).rejects.toThrowError("Not authenticated");
  });

  it("submitEvent creates a pending event with permission", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("tenantBranding", {
        orgId: "org_1",
        orgSlug: "submit-org",
        siteName: "Submit Org",
      });
      await ctx.db.insert("orgPermissionDefaults", {
        orgId: "org_1",
        contactDefaults: [],
        userDefaults: [PERMISSIONS.EVENTS_SUBMIT, PERMISSIONS.COUPONS_CLAIM],
      });
    });

    const authed = t.withIdentity({ subject: "user_abc" });
    const eventId = await authed.mutation(api.public.mutations.submitEvent, {
      orgSlug: "submit-org",
      name: "Community Meetup",
      date: 1800000000000,
    });
    expect(eventId).toBeTruthy();

    const doc = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(doc!.name).toBe("Community Meetup");
    expect(doc!.isApproved).toBe(false);
    expect(doc!.orgId).toBe("org_1");
    expect(doc!.submittedBy).toBe("user_abc");
  });

  it("submitEvent denied without permission", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("tenantBranding", {
        orgId: "org_1",
        orgSlug: "locked-org",
        siteName: "Locked Org",
      });
      await ctx.db.insert("orgPermissionDefaults", {
        orgId: "org_1",
        contactDefaults: [],
        userDefaults: [],
      });
    });

    const authed = t.withIdentity({ subject: "user_no_perms" });
    await expect(
      authed.mutation(api.public.mutations.submitEvent, {
        orgSlug: "locked-org",
        name: "Blocked Event",
        date: 1800000000000,
      })
    ).rejects.toThrowError("Permission denied");
  });

  it("submitEvent auto-approves when user has events:create", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("tenantBranding", {
        orgId: "org_1",
        orgSlug: "auto-org",
        siteName: "Auto Org",
      });
      await ctx.db.insert("orgPermissionDefaults", {
        orgId: "org_1",
        contactDefaults: [],
        userDefaults: [PERMISSIONS.EVENTS_CREATE],
      });
    });

    const authed = t.withIdentity({ subject: "trusted_user" });
    const eventId = await authed.mutation(api.public.mutations.submitEvent, {
      orgSlug: "auto-org",
      name: "Auto-Approved Event",
      date: 1800000000000,
    });
    expect(eventId).toBeTruthy();

    const doc = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(doc!.isApproved).toBe(true);
  });

  it("submitEvent with explicit events:create grant auto-approves over submit defaults", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("tenantBranding", {
        orgId: "org_1",
        orgSlug: "mixed-org",
        siteName: "Mixed Org",
      });
      await ctx.db.insert("orgPermissionDefaults", {
        orgId: "org_1",
        contactDefaults: [],
        userDefaults: [PERMISSIONS.EVENTS_SUBMIT],
      });
      await ctx.db.insert("orgPermissions", {
        userId: "promoted_user",
        orgId: "org_1",
        role: "user",
        permissions: [PERMISSIONS.EVENTS_CREATE],
        isActive: true,
      });
    });

    const authed = t.withIdentity({ subject: "promoted_user" });
    const eventId = await authed.mutation(api.public.mutations.submitEvent, {
      orgSlug: "mixed-org",
      name: "Promoted Event",
      date: 1800000000000,
    });

    const doc = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(doc!.isApproved).toBe(true);
  });

  it("claimCoupon requires authentication", async () => {
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

    await expect(
      t.mutation(api.public.mutations.claimCoupon, { couponId })
    ).rejects.toThrowError("Not authenticated");
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
      await ctx.db.insert("orgPermissionDefaults", {
        orgId: "org_1",
        contactDefaults: [],
        userDefaults: [PERMISSIONS.COUPONS_CLAIM],
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

    const authed = t.withIdentity({ subject: "user_claimer" });
    const claimId = await authed.mutation(api.public.mutations.claimCoupon, {
      couponId,
    });
    expect(claimId).toBeTruthy();

    await expect(
      authed.mutation(api.public.mutations.claimCoupon, { couponId })
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
      await ctx.db.insert("orgPermissionDefaults", {
        orgId: "org_1",
        contactDefaults: [],
        userDefaults: [PERMISSIONS.COUPONS_CLAIM],
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

    const authed = t.withIdentity({ subject: "user_late" });
    await expect(
      authed.mutation(api.public.mutations.claimCoupon, { couponId })
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
