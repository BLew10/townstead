import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("adPlacements", () => {
  it("tenant isolation — listByLayout only returns placements for the given layout", async () => {
    const t = convexTest(schema, modules);

    const { layoutA, layoutB } = await t.run(async (ctx) => {
      const lA = await ctx.db.insert("layouts", {
        name: "Layout A",
        orgId: "org_1",
        isDeleted: false,
      });
      const lB = await ctx.db.insert("layouts", {
        name: "Layout B",
        orgId: "org_1",
        isDeleted: false,
      });
      const adId = await ctx.db.insert("advertisements", {
        name: "Banner",
        isDayType: false,
        slotsPerMonth: 1,
        orgId: "org_1",
      });
      await ctx.db.insert("adPlacements", {
        layoutId: lA,
        advertisementId: adId,
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        orgId: "org_1",
      });
      await ctx.db.insert("adPlacements", {
        layoutId: lB,
        advertisementId: adId,
        x: 10,
        y: 10,
        width: 200,
        height: 100,
        orgId: "org_1",
      });
      return { layoutA: lA, layoutB: lB };
    });

    const resultsA = await t.query(api.adPlacements.queries.listByLayout, {
      layoutId: layoutA,
    });
    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].x).toBe(0);

    const resultsB = await t.query(api.adPlacements.queries.listByLayout, {
      layoutId: layoutB,
    });
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].x).toBe(10);
  });

  it("CRUD — create, update, remove", async () => {
    const t = convexTest(schema, modules);

    const { layoutId, adId } = await t.run(async (ctx) => {
      const lid = await ctx.db.insert("layouts", {
        name: "Full Page",
        orgId: "org_1",
        isDeleted: false,
      });
      const aid = await ctx.db.insert("advertisements", {
        name: "Sidebar",
        isDayType: false,
        slotsPerMonth: 2,
        orgId: "org_1",
      });
      return { layoutId: lid, adId: aid };
    });

    const id = await t.mutation(api.adPlacements.mutations.create, {
      orgId: "org_1",
      layoutId,
      advertisementId: adId,
      x: 50,
      y: 100,
      width: 300,
      height: 250,
      position: "top",
    });
    expect(id).toBeTruthy();

    const listed = await t.query(api.adPlacements.queries.listByLayout, {
      layoutId,
    });
    expect(listed).toHaveLength(1);
    expect(listed[0].position).toBe("top");

    await t.mutation(api.adPlacements.mutations.update, {
      id,
      x: 60,
      y: 110,
      width: 320,
      height: 260,
      position: "bottom",
    });

    const updated = await t.run(async (ctx) => ctx.db.get(id));
    expect(updated!.x).toBe(60);
    expect(updated!.position).toBe("bottom");

    await t.mutation(api.adPlacements.mutations.remove, { id });

    const afterRemove = await t.query(api.adPlacements.queries.listByLayout, {
      layoutId,
    });
    expect(afterRemove).toHaveLength(0);
  });

  it("listByLayout returns empty for a layout with no placements", async () => {
    const t = convexTest(schema, modules);

    const layoutId = await t.run(async (ctx) => {
      return await ctx.db.insert("layouts", {
        name: "Empty Layout",
        orgId: "org_1",
        isDeleted: false,
      });
    });

    const results = await t.query(api.adPlacements.queries.listByLayout, {
      layoutId,
    });
    expect(results).toHaveLength(0);
  });
});
