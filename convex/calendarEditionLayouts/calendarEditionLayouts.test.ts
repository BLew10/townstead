import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("calendarEditionLayouts", () => {
  it("tenant isolation — org_a cannot see org_b assignments", async () => {
    const t = convexTest(schema, modules);

    const layoutId = await t.run(async (ctx) => {
      const editionId = await ctx.db.insert("calendarEditions", {
        name: "Spring",
        code: "SP",
        orgId: "org_b",
      });
      const lid = await ctx.db.insert("layouts", {
        name: "Full",
        orgId: "org_b",
        isDeleted: false,
      });
      await ctx.db.insert("calendarEditionLayouts", {
        calendarEditionId: editionId,
        layoutId: lid,
        year: 2026,
        orgId: "org_b",
      });
      return lid;
    });

    const results = await t.query(
      api.calendarEditionLayouts.queries.listByLayout,
      { orgId: "org_a", layoutId }
    );
    expect(results).toHaveLength(0);
  });

  it("assign creates a new layout assignment and unassign removes it", async () => {
    const t = convexTest(schema, modules);

    const { editionId, layoutId } = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("calendarEditions", {
        name: "Fall 2026",
        code: "FA26",
        orgId: "org_1",
      });
      const lid = await ctx.db.insert("layouts", {
        name: "Half Page",
        orgId: "org_1",
        isDeleted: false,
      });
      return { editionId: eid, layoutId: lid };
    });

    const id = await t.mutation(
      api.calendarEditionLayouts.mutations.assign,
      {
        orgId: "org_1",
        calendarEditionId: editionId,
        layoutId,
        year: 2026,
      }
    );
    expect(id).toBeTruthy();

    const listed = await t.query(
      api.calendarEditionLayouts.queries.listByLayout,
      { orgId: "org_1", layoutId }
    );
    expect(listed).toHaveLength(1);
    expect(listed[0].year).toBe(2026);

    await t.mutation(api.calendarEditionLayouts.mutations.unassign, { id });

    const afterUnassign = await t.query(
      api.calendarEditionLayouts.queries.listByLayout,
      { orgId: "org_1", layoutId }
    );
    expect(afterUnassign).toHaveLength(0);
  });

  it("assign throws on duplicate edition+layout+year+org combination", async () => {
    const t = convexTest(schema, modules);

    const { editionId, layoutId } = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("calendarEditions", {
        name: "Winter",
        code: "WIN",
        orgId: "org_1",
      });
      const lid = await ctx.db.insert("layouts", {
        name: "Banner",
        orgId: "org_1",
        isDeleted: false,
      });
      return { editionId: eid, layoutId: lid };
    });

    await t.mutation(api.calendarEditionLayouts.mutations.assign, {
      orgId: "org_1",
      calendarEditionId: editionId,
      layoutId,
      year: 2026,
    });

    await expect(
      t.mutation(api.calendarEditionLayouts.mutations.assign, {
        orgId: "org_1",
        calendarEditionId: editionId,
        layoutId,
        year: 2026,
      })
    ).rejects.toThrowError("already assigned");
  });
});
