import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("portal", () => {
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

  it("getDashboardData returns data for a linked client", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Client Corp",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_portal",
        orgId: "org_1",
        role: "contact",
        permissions: [],
        contactId,
        isActive: true,
      });
    });

    const asPortalUser = t.withIdentity({
      name: "Jane Doe",
      subject: "user_portal",
    });

    const data = await asPortalUser.query(
      api.portal.queries.getDashboardData,
      { now: 1710000000000 }
    );
    expect(data.activeAdsCount).toBe(0);
    expect(data.totalOutstanding).toBe(0);
    expect(data.upcomingPayments).toHaveLength(0);
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
        permissions: [],
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

    const purchases = await asUser.query(
      api.portal.queries.getMyPurchases,
      { now: 1710000000000 }
    );
    expect(purchases).toHaveLength(1);
    expect(purchases[0].invoiceNumber).toBe("26-0001");
    expect(purchases[0].net).toBe(120000);
    expect(purchases[0].amountPaid).toBe(0);
    expect(purchases[0].isPaid).toBe(false);
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
        permissions: [],
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
    const myPurchases = await asMe.query(
      api.portal.queries.getMyPurchases,
      { now: 1710000000000 }
    );
    expect(myPurchases).toHaveLength(1);
  });

  it("getMyAssets returns assets for the linked contact", async () => {
    const t = convexTest(schema, modules);

    const fileId = await t.run(async (ctx) => {
      return await ctx.storage.store(new Blob(["test-file"]));
    });

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Asset Corp",
        firstName: "A",
        lastName: "B",
        orgId: "org_1",
      });
      await ctx.db.insert("orgPermissions", {
        userId: "user_assets",
        orgId: "org_1",
        role: "contact",
        permissions: [],
        contactId,
        isActive: true,
      });
      await ctx.db.insert("clientAssets", {
        contactId,
        fileId,
        fileName: "my-ad.png",
        status: "uploaded",
        orgId: "org_1",
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user_assets" });
    const assets = await asUser.query(api.portal.queries.getMyAssets, {});
    expect(assets).toHaveLength(1);
    expect(assets[0].fileName).toBe("my-ad.png");
  });

  it("getMyGrant returns null for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.orgPermissions.queries.getMyGrant, {});
    expect(result).toBeNull();
  });

  it("getMyGrant returns active contact grant", async () => {
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
    const grant = await asUser.query(api.orgPermissions.queries.getMyGrant, {});
    expect(grant).not.toBeNull();
    expect(grant!.contactId).toEqual(contactId);
  });
});
