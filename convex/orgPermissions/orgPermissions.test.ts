import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { PERMISSIONS, DEFAULT_CONTACT_PERMISSIONS, DEFAULT_USER_PERMISSIONS } from "../permissions";

describe("orgPermissions", () => {
  describe("tenant isolation", () => {
    it("listByOrg only returns grants for the authenticated org", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        await ctx.db.insert("orgPermissions", {
          userId: "user_a",
          orgId: "org_a",
          role: "user",
          permissions: [PERMISSIONS.EVENTS_SUBMIT],
          isActive: true,
        });
        await ctx.db.insert("orgPermissions", {
          userId: "user_b",
          orgId: "org_b",
          role: "user",
          permissions: [PERMISSIONS.EVENTS_SUBMIT],
          isActive: true,
        });
      });

      const asOrgA = t.withIdentity({ name: "Admin", orgId: "org_a" });
      const results = await asOrgA.query(api.orgPermissions.queries.listByOrg, {});
      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe("user_a");
    });
  });

  describe("grantPermission", () => {
    it("creates a new grant", async () => {
      const t = convexTest(schema, modules);
      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      const id = await asOrg.mutation(api.orgPermissions.mutations.grantPermission, {
        userId: "user_1",
        role: "user",
        permissions: [PERMISSIONS.EVENTS_SUBMIT],
      });

      expect(id).toBeTruthy();

      const grant = await t.run(async (ctx) => ctx.db.get(id));
      expect(grant!.role).toBe("user");
      expect(grant!.isActive).toBe(true);
      expect(grant!.permissions).toContain(PERMISSIONS.EVENTS_SUBMIT);
    });

    it("rejects duplicate grant for same user+org", async () => {
      const t = convexTest(schema, modules);
      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      await asOrg.mutation(api.orgPermissions.mutations.grantPermission, {
        userId: "user_1",
        role: "user",
      });

      await expect(
        asOrg.mutation(api.orgPermissions.mutations.grantPermission, {
          userId: "user_1",
          role: "user",
        })
      ).rejects.toThrowError("already has a permission grant");
    });

    it("requires contactId for contact role", async () => {
      const t = convexTest(schema, modules);
      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      await expect(
        asOrg.mutation(api.orgPermissions.mutations.grantPermission, {
          userId: "user_1",
          role: "contact",
        })
      ).rejects.toThrowError("contactId is required");
    });

    it("rejects contact from different org", async () => {
      const t = convexTest(schema, modules);

      const contactId = await t.run(async (ctx) => {
        return await ctx.db.insert("contacts", {
          company: "Other Corp",
          firstName: "X",
          lastName: "Y",
          orgId: "org_other",
        });
      });

      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      await expect(
        asOrg.mutation(api.orgPermissions.mutations.grantPermission, {
          userId: "user_1",
          role: "contact",
          contactId,
        })
      ).rejects.toThrowError("Contact not found");
    });

    it("rejects duplicate contact link", async () => {
      const t = convexTest(schema, modules);

      const contactId = await t.run(async (ctx) => {
        return await ctx.db.insert("contacts", {
          company: "Corp",
          firstName: "A",
          lastName: "B",
          orgId: "org_1",
        });
      });

      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      await asOrg.mutation(api.orgPermissions.mutations.grantPermission, {
        userId: "user_1",
        role: "contact",
        contactId,
      });

      await expect(
        asOrg.mutation(api.orgPermissions.mutations.grantPermission, {
          userId: "user_2",
          role: "contact",
          contactId,
        })
      ).rejects.toThrowError("already has a linked account");
    });

    it("rejects unauthenticated calls", async () => {
      const t = convexTest(schema, modules);
      await expect(
        t.mutation(api.orgPermissions.mutations.grantPermission, {
          userId: "user_1",
          role: "user",
        })
      ).rejects.toThrowError("Not authenticated");
    });
  });

  describe("linkContact / unlinkContact", () => {
    it("links and unlinks a contact", async () => {
      const t = convexTest(schema, modules);

      const contactId = await t.run(async (ctx) => {
        return await ctx.db.insert("contacts", {
          company: "Test Corp",
          firstName: "Jane",
          lastName: "Doe",
          orgId: "org_1",
        });
      });

      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      const grantId = await asOrg.mutation(api.orgPermissions.mutations.linkContact, {
        userId: "user_123",
        contactId,
      });
      expect(grantId).toBeTruthy();

      const grant = await asOrg.query(api.orgPermissions.queries.getForContact, {
        contactId,
      });
      expect(grant).not.toBeNull();
      expect(grant!.userId).toBe("user_123");
      expect(grant!.role).toBe("contact");

      await asOrg.mutation(api.orgPermissions.mutations.unlinkContact, {
        id: grantId,
      });

      const afterUnlink = await asOrg.query(api.orgPermissions.queries.getForContact, {
        contactId,
      });
      expect(afterUnlink).toBeNull();
    });

    it("is idempotent when same userId+contactId already linked", async () => {
      const t = convexTest(schema, modules);

      const contactId = await t.run(async (ctx) => {
        return await ctx.db.insert("contacts", {
          company: "Idem Corp",
          firstName: "Idem",
          lastName: "Test",
          orgId: "org_1",
        });
      });

      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      const grantId1 = await asOrg.mutation(api.orgPermissions.mutations.linkContact, {
        userId: "user_idem",
        contactId,
      });

      const grantId2 = await asOrg.mutation(api.orgPermissions.mutations.linkContact, {
        userId: "user_idem",
        contactId,
      });

      expect(grantId1).toEqual(grantId2);
    });

    it("rejects linking contact to a different user when already linked", async () => {
      const t = convexTest(schema, modules);

      const contactId = await t.run(async (ctx) => {
        return await ctx.db.insert("contacts", {
          company: "Dup Corp",
          firstName: "Dup",
          lastName: "Test",
          orgId: "org_1",
        });
      });

      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      await asOrg.mutation(api.orgPermissions.mutations.linkContact, {
        userId: "user_first",
        contactId,
      });

      await expect(
        asOrg.mutation(api.orgPermissions.mutations.linkContact, {
          userId: "user_second",
          contactId,
        })
      ).rejects.toThrowError("already has a linked client account");
    });

    it("rejects duplicate userId within same org", async () => {
      const t = convexTest(schema, modules);

      const { contact1, contact2 } = await t.run(async (ctx) => {
        const c1 = await ctx.db.insert("contacts", {
          company: "Corp 1",
          firstName: "A",
          lastName: "One",
          orgId: "org_1",
        });
        const c2 = await ctx.db.insert("contacts", {
          company: "Corp 2",
          firstName: "B",
          lastName: "Two",
          orgId: "org_1",
        });
        return { contact1: c1, contact2: c2 };
      });

      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      await asOrg.mutation(api.orgPermissions.mutations.linkContact, {
        userId: "user_same",
        contactId: contact1,
      });

      await expect(
        asOrg.mutation(api.orgPermissions.mutations.linkContact, {
          userId: "user_same",
          contactId: contact2,
        })
      ).rejects.toThrowError("already linked to another contact");
    });

    it("unlinkContact rejects non-contact role", async () => {
      const t = convexTest(schema, modules);
      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      const grantId = await asOrg.mutation(api.orgPermissions.mutations.grantPermission, {
        userId: "user_1",
        role: "user",
      });

      await expect(
        asOrg.mutation(api.orgPermissions.mutations.unlinkContact, { id: grantId })
      ).rejects.toThrowError("Can only unlink contact-role grants");
    });
  });

  describe("getForContact", () => {
    it("returns null for grant belonging to different org", async () => {
      const t = convexTest(schema, modules);

      const contactId = await t.run(async (ctx) => {
        const cId = await ctx.db.insert("contacts", {
          company: "Other",
          firstName: "X",
          lastName: "Y",
          orgId: "org_b",
        });
        await ctx.db.insert("orgPermissions", {
          userId: "user_x",
          orgId: "org_b",
          role: "contact",
          permissions: [],
          contactId: cId,
          isActive: true,
        });
        return cId;
      });

      const asOrgA = t.withIdentity({ name: "Admin", orgId: "org_a" });
      const result = await asOrgA.query(api.orgPermissions.queries.getForContact, {
        contactId,
      });
      expect(result).toBeNull();
    });

    it("returns null when unauthenticated", async () => {
      const t = convexTest(schema, modules);

      const contactId = await t.run(async (ctx) => {
        return await ctx.db.insert("contacts", {
          company: "Corp",
          firstName: "A",
          lastName: "B",
          orgId: "org_1",
        });
      });

      const result = await t.query(api.orgPermissions.queries.getForContact, {
        contactId,
      });
      expect(result).toBeNull();
    });

    it("returns null when identity has no orgId", async () => {
      const t = convexTest(schema, modules);

      const contactId = await t.run(async (ctx) => {
        return await ctx.db.insert("contacts", {
          company: "Corp",
          firstName: "A",
          lastName: "B",
          orgId: "org_1",
        });
      });

      const noOrg = t.withIdentity({ name: "User" });
      const result = await noOrg.query(api.orgPermissions.queries.getForContact, {
        contactId,
      });
      expect(result).toBeNull();
    });

    it("returns grant when orgId matches", async () => {
      const t = convexTest(schema, modules);

      const contactId = await t.run(async (ctx) => {
        const cId = await ctx.db.insert("contacts", {
          company: "Corp",
          firstName: "A",
          lastName: "B",
          orgId: "org_1",
        });
        await ctx.db.insert("orgPermissions", {
          userId: "user_x",
          orgId: "org_1",
          role: "contact",
          permissions: [],
          contactId: cId,
          isActive: true,
        });
        return cId;
      });

      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });
      const result = await asOrg.query(api.orgPermissions.queries.getForContact, {
        contactId,
      });
      expect(result).not.toBeNull();
      expect(result!.userId).toBe("user_x");
    });

    it("finds same-org grant even when a different-org grant exists for the same contactId", async () => {
      const t = convexTest(schema, modules);

      const contactId = await t.run(async (ctx) => {
        const cId = await ctx.db.insert("contacts", {
          company: "Multi-Org Corp",
          firstName: "M",
          lastName: "O",
          orgId: "org_1",
        });
        await ctx.db.insert("orgPermissions", {
          userId: "user_other",
          orgId: "org_other",
          role: "contact",
          permissions: [],
          contactId: cId,
          isActive: true,
        });
        await ctx.db.insert("orgPermissions", {
          userId: "user_correct",
          orgId: "org_1",
          role: "contact",
          permissions: [],
          contactId: cId,
          isActive: true,
        });
        return cId;
      });

      const asOrg1 = t.withIdentity({ name: "Admin", orgId: "org_1" });
      const result = await asOrg1.query(api.orgPermissions.queries.getForContact, {
        contactId,
      });
      expect(result).not.toBeNull();
      expect(result!.userId).toBe("user_correct");
      expect(result!.orgId).toBe("org_1");
    });
  });

  describe("linkContact orgId scoping", () => {
    it("allows linking when a grant exists for the same contactId in a different org", async () => {
      const t = convexTest(schema, modules);

      const contactId = await t.run(async (ctx) => {
        const cId = await ctx.db.insert("contacts", {
          company: "Shared Corp",
          firstName: "S",
          lastName: "C",
          orgId: "org_1",
        });
        await ctx.db.insert("orgPermissions", {
          userId: "user_other_org",
          orgId: "org_other",
          role: "contact",
          permissions: [],
          contactId: cId,
          isActive: true,
        });
        return cId;
      });

      const asOrg1 = t.withIdentity({ name: "Admin", orgId: "org_1" });
      const grantId = await asOrg1.mutation(api.orgPermissions.mutations.linkContact, {
        userId: "user_org1",
        contactId,
      });
      expect(grantId).toBeTruthy();
    });
  });

  describe("toggleActive", () => {
    it("deactivates and reactivates a grant", async () => {
      const t = convexTest(schema, modules);
      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      const grantId = await asOrg.mutation(api.orgPermissions.mutations.grantPermission, {
        userId: "user_1",
        role: "user",
      });

      await asOrg.mutation(api.orgPermissions.mutations.toggleActive, {
        id: grantId,
        isActive: false,
      });

      let grant = await t.run(async (ctx) => ctx.db.get(grantId));
      expect(grant!.isActive).toBe(false);

      await asOrg.mutation(api.orgPermissions.mutations.toggleActive, {
        id: grantId,
        isActive: true,
      });

      grant = await t.run(async (ctx) => ctx.db.get(grantId));
      expect(grant!.isActive).toBe(true);
    });
  });

  describe("updatePermissions", () => {
    it("updates the permissions array on a grant", async () => {
      const t = convexTest(schema, modules);
      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      const grantId = await asOrg.mutation(api.orgPermissions.mutations.grantPermission, {
        userId: "user_1",
        role: "user",
        permissions: [PERMISSIONS.EVENTS_SUBMIT],
      });

      await asOrg.mutation(api.orgPermissions.mutations.updatePermissions, {
        id: grantId,
        permissions: [PERMISSIONS.EVENTS_SUBMIT, PERMISSIONS.COUPONS_CLAIM],
      });

      const grant = await t.run(async (ctx) => ctx.db.get(grantId));
      expect(grant!.permissions).toHaveLength(2);
      expect(grant!.permissions).toContain(PERMISSIONS.COUPONS_CLAIM);
    });
  });

  describe("updateDefaults / ensureDefaults", () => {
    it("creates defaults when none exist", async () => {
      const t = convexTest(schema, modules);
      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      const id = await asOrg.mutation(api.orgPermissions.mutations.ensureDefaults, {});
      expect(id).toBeTruthy();

      const defaults = await asOrg.query(api.orgPermissions.queries.getDefaults, {});
      expect(defaults).not.toBeNull();
      expect(defaults!.contactDefaults).toEqual(DEFAULT_CONTACT_PERMISSIONS);
      expect(defaults!.userDefaults).toEqual(DEFAULT_USER_PERMISSIONS);
    });

    it("ensureDefaults is idempotent", async () => {
      const t = convexTest(schema, modules);
      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      const id1 = await asOrg.mutation(api.orgPermissions.mutations.ensureDefaults, {});
      const id2 = await asOrg.mutation(api.orgPermissions.mutations.ensureDefaults, {});
      expect(id1).toEqual(id2);
    });

    it("updateDefaults creates when none exist", async () => {
      const t = convexTest(schema, modules);
      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      await asOrg.mutation(api.orgPermissions.mutations.updateDefaults, {
        contactDefaults: [PERMISSIONS.PORTAL_VIEW],
        userDefaults: [],
      });

      const defaults = await asOrg.query(api.orgPermissions.queries.getDefaults, {});
      expect(defaults!.contactDefaults).toEqual([PERMISSIONS.PORTAL_VIEW]);
      expect(defaults!.userDefaults).toEqual([]);
    });

    it("updateDefaults patches existing", async () => {
      const t = convexTest(schema, modules);
      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      await asOrg.mutation(api.orgPermissions.mutations.ensureDefaults, {});

      await asOrg.mutation(api.orgPermissions.mutations.updateDefaults, {
        contactDefaults: [PERMISSIONS.PORTAL_VIEW],
        userDefaults: [PERMISSIONS.COUPONS_CLAIM],
      });

      const defaults = await asOrg.query(api.orgPermissions.queries.getDefaults, {});
      expect(defaults!.contactDefaults).toEqual([PERMISSIONS.PORTAL_VIEW]);
      expect(defaults!.userDefaults).toEqual([PERMISSIONS.COUPONS_CLAIM]);
    });
  });

  describe("revokePermission", () => {
    it("deletes the grant", async () => {
      const t = convexTest(schema, modules);
      const asOrg = t.withIdentity({ name: "Admin", orgId: "org_1" });

      const grantId = await asOrg.mutation(api.orgPermissions.mutations.grantPermission, {
        userId: "user_1",
        role: "user",
      });

      await asOrg.mutation(api.orgPermissions.mutations.revokePermission, {
        id: grantId,
      });

      const grants = await asOrg.query(api.orgPermissions.queries.listByOrg, {});
      expect(grants).toHaveLength(0);
    });

    it("rejects revoking grant from different org", async () => {
      const t = convexTest(schema, modules);

      const grantId = await t.run(async (ctx) => {
        return await ctx.db.insert("orgPermissions", {
          userId: "user_1",
          orgId: "org_b",
          role: "user",
          permissions: [],
          isActive: true,
        });
      });

      const asOrgA = t.withIdentity({ name: "Admin", orgId: "org_a" });
      await expect(
        asOrgA.mutation(api.orgPermissions.mutations.revokePermission, { id: grantId })
      ).rejects.toThrowError("Not found");
    });
  });
});
