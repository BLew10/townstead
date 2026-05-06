import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { PERMISSIONS } from "../permissions";

describe("portal queries — auth", () => {
  it("getDashboardData rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.query(api.portal.queries.getDashboardData, { now: 1710000000000 })
    ).rejects.toThrowError("Not authenticated");
  });

  it("getDashboardData rejects user without portal access", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({
      name: "Unknown User",
      subject: "user_no_link",
    });

    await expect(
      asUser.query(api.portal.queries.getDashboardData, { now: 1710000000000 })
    ).rejects.toThrowError("No portal access");
  });

  it("getDashboardData rejects inactive grant", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Inactive Corp",
        firstName: "X",
        lastName: "Y",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_inactive",
        orgId: "org_1",
        role: "contact",
        permissions: [],
        contactId,
        isActive: false,
      });
    });

    const asUser = t.withIdentity({
      name: "Inactive",
      subject: "user_inactive",
    });

    await expect(
      asUser.query(api.portal.queries.getDashboardData, { now: 1710000000000 })
    ).rejects.toThrowError("No portal access");
  });
});

describe("portal queries — permission enforcement", () => {
  it("getDashboardData returns null when contact lacks portal:view", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_no_view",
        orgId: "org_1",
        role: "contact",
        permissions: [PERMISSIONS.PORTAL_ASSETS],
        contactId,
        isActive: true,
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_no_view" });
    const data = await asUser.query(api.portal.queries.getDashboardData, {
      now: 1710000000000,
    });
    expect(data).toBeNull();
  });

  it("getDashboardData returns data when contact has portal:view", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_portal",
        orgId: "org_1",
        role: "contact",
        permissions: [PERMISSIONS.PORTAL_VIEW],
        contactId,
        isActive: true,
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_portal" });
    const data = await asUser.query(api.portal.queries.getDashboardData, {
      now: 1710000000000,
    });
    expect(data).not.toBeNull();
    expect(data!.activeAdsCount).toBe(0);
  });

  it("getDashboardData uses defaults when permissions array is empty", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_defaults",
        orgId: "org_1",
        role: "contact",
        permissions: [],
        contactId,
        isActive: true,
      });
      await ctx.db.insert("orgPermissionDefaults", {
        orgId: "org_1",
        contactDefaults: [
          PERMISSIONS.PORTAL_VIEW,
          PERMISSIONS.PORTAL_ASSETS,
          PERMISSIONS.PORTAL_PAYMENTS,
          PERMISSIONS.PORTAL_INVOICES,
          PERMISSIONS.PORTAL_MESSAGES,
        ],
        userDefaults: [],
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_defaults" });
    const data = await asUser.query(api.portal.queries.getDashboardData, {
      now: 1710000000000,
    });
    expect(data).not.toBeNull();
  });

  it("getMyAssets returns null when contact lacks portal:assets", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_no_assets",
        orgId: "org_1",
        role: "contact",
        permissions: [PERMISSIONS.PORTAL_VIEW],
        contactId,
        isActive: true,
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_no_assets" });
    const assets = await asUser.query(api.portal.queries.getMyAssets, {});
    expect(assets).toBeNull();
  });

  it("getMyAssets returns data when contact has portal:assets", async () => {
    const t = convexTest(schema, modules);

    const fileId = await t.run(async (ctx) => {
      return await ctx.storage.store(new Blob(["test-file"]));
    });

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_with_assets",
        orgId: "org_1",
        role: "contact",
        permissions: [PERMISSIONS.PORTAL_ASSETS],
        contactId,
        isActive: true,
      });
      await ctx.db.insert("clientAssets", {
        contactId,
        fileId,
        fileName: "ad.png",
        status: "uploaded",
        orgId: "org_1",
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_with_assets" });
    const assets = await asUser.query(api.portal.queries.getMyAssets, {});
    expect(assets).not.toBeNull();
    expect(assets).toHaveLength(1);
  });

  it("getPaymentHistory returns null when contact lacks portal:payments", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_no_payments",
        orgId: "org_1",
        role: "contact",
        permissions: [PERMISSIONS.PORTAL_VIEW],
        contactId,
        isActive: true,
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_no_payments" });
    const history = await asUser.query(api.portal.queries.getPaymentHistory, {});
    expect(history).toBeNull();
  });

  it("getInvoices returns null when contact lacks portal:invoices", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_no_invoices",
        orgId: "org_1",
        role: "contact",
        permissions: [PERMISSIONS.PORTAL_VIEW],
        contactId,
        isActive: true,
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_no_invoices" });
    const invoices = await asUser.query(api.portal.queries.getInvoices, {
      now: 1710000000000,
    });
    expect(invoices).toBeNull();
  });

  it("getMyPermissions returns null for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.portal.queries.getMyPermissions, {});
    expect(result).toBeNull();
  });

  it("getMyPermissions returns explicit permissions when set", async () => {
    const t = convexTest(schema, modules);
    const explicitPerms = [PERMISSIONS.PORTAL_VIEW, PERMISSIONS.PORTAL_ASSETS];

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_explicit",
        orgId: "org_1",
        role: "contact",
        permissions: explicitPerms,
        contactId,
        isActive: true,
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_explicit" });
    const perms = await asUser.query(api.portal.queries.getMyPermissions, {});
    expect(perms).toEqual(explicitPerms);
  });

  it("getMyPermissions falls back to defaults when permissions array is empty", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_fallback",
        orgId: "org_1",
        role: "contact",
        permissions: [],
        contactId,
        isActive: true,
      });
      await ctx.db.insert("orgPermissionDefaults", {
        orgId: "org_1",
        contactDefaults: [
          PERMISSIONS.PORTAL_VIEW,
          PERMISSIONS.PORTAL_ASSETS,
          PERMISSIONS.PORTAL_PAYMENTS,
          PERMISSIONS.PORTAL_INVOICES,
          PERMISSIONS.PORTAL_MESSAGES,
        ],
        userDefaults: [],
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_fallback" });
    const perms = await asUser.query(api.portal.queries.getMyPermissions, {});
    expect(perms).toContain(PERMISSIONS.PORTAL_VIEW);
    expect(perms).toContain(PERMISSIONS.PORTAL_ASSETS);
  });
});

describe("portal queries — data correctness", () => {
  it("getMyPurchases returns purchases for the linked contact", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Buyer Inc",
        firstName: "Bob",
        lastName: "Smith",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_buyer",
        orgId: "org_1",
        role: "contact",
        permissions: [PERMISSIONS.PORTAL_VIEW],
        contactId,
        isActive: true,
      });
      const editionId = await ctx.db.insert("calendarEditions", {
        name: "Spring 2026",
        code: "SP26",
        orgId: "org_1",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [editionId],
        year: 2026,
        invoiceNumber: "26-0001",
        orgId: "org_1",
        isDeleted: false,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 120000,
        orgId: "org_1",
      });
    });

    const asUser = t.withIdentity({
      name: "Bob Smith",
      subject: "user_buyer",
    });

    const purchases = await asUser.query(api.portal.queries.getMyPurchases, {
      now: 1710000000000,
    });
    expect(purchases).toHaveLength(1);
    expect(purchases![0].invoiceNumber).toBe("26-0001");
    expect(purchases![0].net).toBe(120000);
    expect(purchases![0].amountPaid).toBe(0);
    expect(purchases![0].isPaid).toBe(false);
  });

  it("tenant isolation — linked user only sees own contact purchases", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const myContact = await ctx.db.insert("contacts", {
        company: "My Corp",
        firstName: "Me",
        lastName: "Mine",
        orgId: "org_1",
      });
      const otherContact = await ctx.db.insert("contacts", {
        company: "Other",
        firstName: "Other",
        lastName: "Person",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_me",
        orgId: "org_1",
        role: "contact",
        permissions: [PERMISSIONS.PORTAL_VIEW],
        contactId: myContact,
        isActive: true,
      });
      const editionId = await ctx.db.insert("calendarEditions", {
        name: "Edition",
        code: "ED",
        orgId: "org_1",
      });
      await ctx.db.insert("purchases", {
        contactId: myContact,
        calendarEditionIds: [editionId],
        year: 2026,
        orgId: "org_1",
        isDeleted: false,
      });
      await ctx.db.insert("purchases", {
        contactId: otherContact,
        calendarEditionIds: [editionId],
        year: 2026,
        orgId: "org_1",
        isDeleted: false,
      });
    });

    const asMe = t.withIdentity({ name: "Me", subject: "user_me" });
    const myPurchases = await asMe.query(api.portal.queries.getMyPurchases, {
      now: 1710000000000,
    });
    expect(myPurchases).toHaveLength(1);
  });
});

describe("portal mutations — updateMyProfile", () => {
  it("rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.portal.mutations.updateMyProfile, {
        firstName: "X",
        lastName: "Y",
        company: "Z",
      })
    ).rejects.toThrowError("Not authenticated");
  });

  it("rejects user without portal access", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({
      name: "Random",
      subject: "user_random",
    });

    await expect(
      asUser.mutation(api.portal.mutations.updateMyProfile, {
        firstName: "X",
        lastName: "Y",
        company: "Z",
      })
    ).rejects.toThrowError("No portal access");
  });

  it("updates contact profile fields", async () => {
    const t = convexTest(schema, modules);

    const contactId = await t.run(async (ctx) => {
      const cId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@test.com",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_edit",
        orgId: "org_1",
        role: "contact",
        permissions: [],
        contactId: cId,
        isActive: true,
      });
      return cId;
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_edit" });
    await asUser.mutation(api.portal.mutations.updateMyProfile, {
      firstName: "Updated",
      lastName: "Name",
      company: "New Corp",
      phone: "555-1234",
    });

    const contact = await t.run(async (ctx) => {
      return await ctx.db.get(contactId);
    });
    expect(contact!.firstName).toBe("Updated");
    expect(contact!.lastName).toBe("Name");
    expect(contact!.company).toBe("New Corp");
    expect(contact!.phone).toBe("555-1234");
  });

  it("preserves email in searchText even though email is not editable", async () => {
    const t = convexTest(schema, modules);

    const contactId = await t.run(async (ctx) => {
      const cId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@test.com",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_search",
        orgId: "org_1",
        role: "contact",
        permissions: [],
        contactId: cId,
        isActive: true,
      });
      return cId;
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_search" });
    await asUser.mutation(api.portal.mutations.updateMyProfile, {
      firstName: "Alice",
      lastName: "Wonderland",
      company: "Wonder Corp",
    });

    const contact = await t.run(async (ctx) => {
      return await ctx.db.get(contactId);
    });
    expect(contact!.searchText).toContain("Alice");
    expect(contact!.searchText).toContain("jane@test.com");
  });

  it("does not modify email field", async () => {
    const t = convexTest(schema, modules);

    const contactId = await t.run(async (ctx) => {
      const cId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@test.com",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_noemail",
        orgId: "org_1",
        role: "contact",
        permissions: [],
        contactId: cId,
        isActive: true,
      });
      return cId;
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_noemail" });
    await asUser.mutation(api.portal.mutations.updateMyProfile, {
      firstName: "Changed",
      lastName: "User",
      company: "Corp",
    });

    const contact = await t.run(async (ctx) => {
      return await ctx.db.get(contactId);
    });
    expect(contact!.email).toBe("jane@test.com");
  });

  it("updates address fields", async () => {
    const t = convexTest(schema, modules);

    const contactId = await t.run(async (ctx) => {
      const cId = await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@test.com",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_addr",
        orgId: "org_1",
        role: "contact",
        permissions: [],
        contactId: cId,
        isActive: true,
      });
      return cId;
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_addr" });
    await asUser.mutation(api.portal.mutations.updateMyProfile, {
      firstName: "Jane",
      lastName: "Doe",
      company: "Test Corp",
      address: {
        street: "123 Main St",
        city: "Springfield",
        state: "IL",
        zip: "62701",
      },
    });

    const contact = await t.run(async (ctx) => {
      return await ctx.db.get(contactId);
    });
    expect(contact!.address?.street).toBe("123 Main St");
    expect(contact!.address?.city).toBe("Springfield");
  });
});

describe("orgPermissions — getMyGrant", () => {
  it("returns null for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.orgPermissions.queries.getMyGrant, {});
    expect(result).toBeNull();
  });

  it("returns active contact grant", async () => {
    const t = convexTest(schema, modules);

    const contactId = await t.run(async (ctx) => {
      const cId = await ctx.db.insert("contacts", {
        company: "Grant Corp",
        firstName: "G",
        lastName: "G",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_grant",
        orgId: "org_1",
        role: "contact",
        permissions: [],
        contactId: cId,
        isActive: true,
      });
      return cId;
    });

    const asUser = t.withIdentity({ subject: "user_grant" });
    const grant = await asUser.query(
      api.orgPermissions.queries.getMyGrant,
      {}
    );
    expect(grant).not.toBeNull();
    expect(grant!.contactId).toEqual(contactId);
  });
});
