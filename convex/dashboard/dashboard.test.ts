import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("dashboard", () => {
  it("tenant isolation — getPrintInventoryData excludes other org editions", async () => {
    const t = convexTest(schema, modules);

    const editionId = await t.run(async (ctx) => {
      return await ctx.db.insert("calendarEditions", {
        name: "Org B Edition",
        code: "OB26",
        orgId: "org_b",
      });
    });

    const result = await t.query(
      api.dashboard.queries.getPrintInventoryData,
      {
        orgId: "org_a",
        year: 2026,
        calendarEditionIds: [editionId],
      }
    );
    expect(result.editions).toHaveLength(0);
    expect(result.contacts).toHaveLength(0);
  });

  it("getDashboardData returns stats for an edition with no purchases", async () => {
    const t = convexTest(schema, modules);

    const editionId = await t.run(async (ctx) => {
      return await ctx.db.insert("calendarEditions", {
        name: "Spring 2026",
        code: "SP26",
        orgId: "org_1",
      });
    });

    const result = await t.query(api.dashboard.queries.getDashboardData, {
      orgId: "org_1",
      calendarEditionId: editionId,
      year: 2026,
    });

    expect(result.slots).toHaveLength(0);
    expect(result.stats.totalRevenue).toBe(0);
    expect(result.stats.collectionRate).toBe(0);
    expect(result.stats.outstandingBalance).toBe(0);
    expect(result.stats.latePaymentsCount).toBe(0);
    expect(result.contacts).toHaveLength(0);
  });

  it("getPrintInventoryData returns edition slots when data exists", async () => {
    const t = convexTest(schema, modules);

    const editionId = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Advertiser",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
      const eid = await ctx.db.insert("calendarEditions", {
        name: "Fall 2026",
        code: "FA26",
        orgId: "org_1",
      });
      const adId = await ctx.db.insert("advertisements", {
        name: "Banner",
        isDayType: false,
        slotsPerMonth: 2,
        orgId: "org_1",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [eid],
        year: 2026,
        orgId: "org_1",
        isDeleted: false,
      });
      const apId = await ctx.db.insert("adPurchases", {
        purchaseId,
        advertisementId: adId,
        calendarEditionId: eid,
        quantity: 1,
        orgId: "org_1",
      });
      await ctx.db.insert("adSlots", {
        adPurchaseId: apId,
        advertisementId: adId,
        calendarEditionId: eid,
        year: 2026,
        month: 3,
        slotNumber: 1,
        orgId: "org_1",
      });
      return eid;
    });

    const result = await t.query(
      api.dashboard.queries.getPrintInventoryData,
      {
        orgId: "org_1",
        year: 2026,
        calendarEditionIds: [editionId],
      }
    );
    expect(result.editions).toHaveLength(1);
    expect(result.editions[0].slots).toHaveLength(1);
    expect(result.contacts.length).toBeGreaterThanOrEqual(1);
  });
});
