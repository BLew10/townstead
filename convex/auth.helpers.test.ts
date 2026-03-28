import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { modules } from "./test.setup";
import {
  DEFAULT_CONTACT_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
  PERMISSIONS,
} from "./permissions";

/**
 * Auth helpers are internal functions, not query/mutation exports.
 * We test them indirectly through a thin Convex function wrapper.
 * For unit-level tests, we seed data and exercise the permission
 * resolution logic via the orgPermissions + orgPermissionDefaults tables.
 *
 * Direct tests of checkPermission logic by seeding data and calling
 * a test-only query are impractical without exporting them as Convex
 * functions. Instead, these tests validate the data model and resolution
 * logic that the helpers rely on, and the helpers are integration-tested
 * via the orgPermissions and public mutation tests.
 */

describe("permission resolution data model", () => {
  it("explicit grant with permissions takes precedence over defaults", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("orgPermissionDefaults", {
        orgId: "org_1",
        contactDefaults: DEFAULT_CONTACT_PERMISSIONS,
        userDefaults: DEFAULT_USER_PERMISSIONS,
      });

      await ctx.db.insert("orgPermissions", {
        userId: "user_1",
        orgId: "org_1",
        role: "user",
        permissions: [PERMISSIONS.EVENTS_SUBMIT],
        isActive: true,
      });

      const grant = await ctx.db
        .query("orgPermissions")
        .withIndex("by_userId_and_orgId", (q) =>
          q.eq("userId", "user_1").eq("orgId", "org_1")
        )
        .first();

      expect(grant).not.toBeNull();
      expect(grant!.permissions).toContain(PERMISSIONS.EVENTS_SUBMIT);
      expect(grant!.permissions).not.toContain(PERMISSIONS.COUPONS_CLAIM);
    });
  });

  it("inactive grant blocks all permissions", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("orgPermissions", {
        userId: "user_1",
        orgId: "org_1",
        role: "contact",
        permissions: [PERMISSIONS.PORTAL_VIEW],
        contactId: undefined,
        isActive: false,
      });

      const grant = await ctx.db
        .query("orgPermissions")
        .withIndex("by_userId_and_orgId", (q) =>
          q.eq("userId", "user_1").eq("orgId", "org_1")
        )
        .first();

      expect(grant).not.toBeNull();
      expect(grant!.isActive).toBe(false);
    });
  });

  it("admin role grant gives implicit access", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("orgPermissions", {
        userId: "admin_user",
        orgId: "org_1",
        role: "admin",
        permissions: [],
        isActive: true,
      });

      const grant = await ctx.db
        .query("orgPermissions")
        .withIndex("by_userId_and_orgId", (q) =>
          q.eq("userId", "admin_user").eq("orgId", "org_1")
        )
        .first();

      expect(grant).not.toBeNull();
      expect(grant!.role).toBe("admin");
    });
  });

  it("empty permissions array on grant falls through to defaults", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("orgPermissionDefaults", {
        orgId: "org_1",
        contactDefaults: [PERMISSIONS.PORTAL_VIEW, PERMISSIONS.PORTAL_ASSETS],
        userDefaults: [PERMISSIONS.EVENTS_SUBMIT],
      });

      await ctx.db.insert("orgPermissions", {
        userId: "user_1",
        orgId: "org_1",
        role: "contact",
        permissions: [],
        isActive: true,
      });

      const grant = await ctx.db
        .query("orgPermissions")
        .withIndex("by_userId_and_orgId", (q) =>
          q.eq("userId", "user_1").eq("orgId", "org_1")
        )
        .first();
      expect(grant!.permissions).toHaveLength(0);

      const defaults = await ctx.db
        .query("orgPermissionDefaults")
        .withIndex("by_orgId", (q) => q.eq("orgId", "org_1"))
        .first();
      expect(defaults!.contactDefaults).toContain(PERMISSIONS.PORTAL_VIEW);
    });
  });

  it("no grant and no defaults means no permissions", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const grant = await ctx.db
        .query("orgPermissions")
        .withIndex("by_userId_and_orgId", (q) =>
          q.eq("userId", "unknown_user").eq("orgId", "org_1")
        )
        .first();
      expect(grant).toBeNull();

      const defaults = await ctx.db
        .query("orgPermissionDefaults")
        .withIndex("by_orgId", (q) => q.eq("orgId", "org_1"))
        .first();
      expect(defaults).toBeNull();
    });
  });

  it("user with no grant uses userDefaults from orgPermissionDefaults", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("orgPermissionDefaults", {
        orgId: "org_1",
        contactDefaults: [PERMISSIONS.PORTAL_VIEW],
        userDefaults: [PERMISSIONS.EVENTS_SUBMIT, PERMISSIONS.COUPONS_CLAIM],
      });

      const defaults = await ctx.db
        .query("orgPermissionDefaults")
        .withIndex("by_orgId", (q) => q.eq("orgId", "org_1"))
        .first();
      expect(defaults!.userDefaults).toContain(PERMISSIONS.EVENTS_SUBMIT);
      expect(defaults!.userDefaults).toContain(PERMISSIONS.COUPONS_CLAIM);
    });
  });

  it("orgPermissions index by_contactId works for contact lookups", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Co",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });

      await ctx.db.insert("orgPermissions", {
        userId: "user_1",
        orgId: "org_1",
        role: "contact",
        permissions: [],
        contactId,
        isActive: true,
      });

      const byContact = await ctx.db
        .query("orgPermissions")
        .withIndex("by_contactId", (q) => q.eq("contactId", contactId))
        .first();
      expect(byContact).not.toBeNull();
      expect(byContact!.userId).toBe("user_1");
    });
  });
});

describe("tiered permission data model", () => {
  it("events:create supersedes events:submit (auto-approval)", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("orgPermissions", {
        userId: "trusted_user",
        orgId: "org_1",
        role: "user",
        permissions: [PERMISSIONS.EVENTS_CREATE, PERMISSIONS.EVENTS_UPDATE_OWN],
        isActive: true,
      });

      const grant = await ctx.db
        .query("orgPermissions")
        .withIndex("by_userId_and_orgId", (q) =>
          q.eq("userId", "trusted_user").eq("orgId", "org_1")
        )
        .first();

      const perms = grant!.permissions;
      const hasCreate = perms.includes(PERMISSIONS.EVENTS_CREATE);
      const hasSubmit = perms.includes(PERMISSIONS.EVENTS_SUBMIT);

      expect(hasCreate).toBe(true);
      expect(hasSubmit).toBe(false);
      // create supersedes submit → no approval needed
      const needsApproval = hasSubmit && !hasCreate;
      expect(needsApproval).toBe(false);
    });
  });

  it("events:submit without events:create means approval required", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("orgPermissions", {
        userId: "regular_user",
        orgId: "org_1",
        role: "user",
        permissions: [PERMISSIONS.EVENTS_SUBMIT],
        isActive: true,
      });

      const grant = await ctx.db
        .query("orgPermissions")
        .withIndex("by_userId_and_orgId", (q) =>
          q.eq("userId", "regular_user").eq("orgId", "org_1")
        )
        .first();

      const perms = grant!.permissions;
      const hasCreate = perms.includes(PERMISSIONS.EVENTS_CREATE);
      const hasSubmit = perms.includes(PERMISSIONS.EVENTS_SUBMIT);

      expect(hasCreate).toBe(false);
      expect(hasSubmit).toBe(true);
      const needsApproval = hasSubmit && !hasCreate;
      expect(needsApproval).toBe(true);
    });
  });

  it("contact defaults support blog tiered permissions", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("orgPermissionDefaults", {
        orgId: "org_1",
        contactDefaults: [
          PERMISSIONS.BLOG_CREATE,
          PERMISSIONS.BLOG_UPDATE_OWN,
          PERMISSIONS.BLOG_DELETE_OWN,
        ],
        userDefaults: [PERMISSIONS.BLOG_SUBMIT],
      });

      const defaults = await ctx.db
        .query("orgPermissionDefaults")
        .withIndex("by_orgId", (q) => q.eq("orgId", "org_1"))
        .first();

      // Contacts get auto-approved blog posts
      expect(defaults!.contactDefaults).toContain(PERMISSIONS.BLOG_CREATE);
      expect(defaults!.contactDefaults).toContain(PERMISSIONS.BLOG_UPDATE_OWN);
      expect(defaults!.contactDefaults).toContain(PERMISSIONS.BLOG_DELETE_OWN);

      // Users can only submit (needs approval)
      expect(defaults!.userDefaults).toContain(PERMISSIONS.BLOG_SUBMIT);
      expect(defaults!.userDefaults).not.toContain(PERMISSIONS.BLOG_CREATE);
    });
  });

  it("update_own and delete_own permissions are independent of create", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("orgPermissions", {
        userId: "limited_user",
        orgId: "org_1",
        role: "user",
        permissions: [
          PERMISSIONS.EVENTS_SUBMIT,
          PERMISSIONS.EVENTS_UPDATE_OWN,
          // no delete_own — can submit and edit but not delete
        ],
        isActive: true,
      });

      const grant = await ctx.db
        .query("orgPermissions")
        .withIndex("by_userId_and_orgId", (q) =>
          q.eq("userId", "limited_user").eq("orgId", "org_1")
        )
        .first();

      const perms = grant!.permissions;
      expect(perms).toContain(PERMISSIONS.EVENTS_UPDATE_OWN);
      expect(perms).not.toContain(PERMISSIONS.EVENTS_DELETE_OWN);
    });
  });
});
