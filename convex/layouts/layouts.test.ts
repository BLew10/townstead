import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("layouts", () => {
  it("tenant isolation — org_a cannot see org_b layouts", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("layouts", {
        name: "Full Page",
        orgId: "org_b",
        isDeleted: false,
      });
    });

    const results = await t.query(api.layouts.queries.list, {
      orgId: "org_a",
    });
    expect(results).toHaveLength(0);
  });

  it("soft-deleted layouts are excluded from list", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("layouts", {
        name: "Active Layout",
        orgId: "org_1",
        isDeleted: false,
      });
      await ctx.db.insert("layouts", {
        name: "Deleted Layout",
        orgId: "org_1",
        isDeleted: true,
      });
    });

    const results = await t.query(api.layouts.queries.list, {
      orgId: "org_1",
    });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Active Layout");
  });

  it("CRUD — create, getById, update, softDelete", async () => {
    const t = convexTest(schema, modules);

    const id = await t.mutation(api.layouts.mutations.create, {
      orgId: "org_1",
      name: "Half Page",
    });
    expect(id).toBeTruthy();

    const fetched = await t.query(api.layouts.queries.getById, { id });
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("Half Page");

    await t.mutation(api.layouts.mutations.update, {
      id,
      name: "Quarter Page",
    });
    const updated = await t.query(api.layouts.queries.getById, { id });
    expect(updated!.name).toBe("Quarter Page");

    await t.mutation(api.layouts.mutations.softDelete, { id });
    const deleted = await t.query(api.layouts.queries.getById, { id });
    expect(deleted!.isDeleted).toBe(true);

    const listed = await t.query(api.layouts.queries.list, {
      orgId: "org_1",
    });
    expect(listed).toHaveLength(0);
  });
});
