import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("calendarEditions.mutations.create", () => {
  it("creates a calendar edition with the given fields", async () => {
    const t = convexTest(schema, modules);

    const editionId = await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_1", name: "Spring 2026", code: "SP26",
    });

    const edition = await t.run(async (ctx) => ctx.db.get(editionId));
    expect(edition).not.toBeNull();
    expect(edition!.name).toBe("Spring 2026");
    expect(edition!.code).toBe("SP26");
    expect(edition!.orgId).toBe("org_1");
    expect(edition!.isDeleted).toBe(false);
  });

  it("rejects duplicate code within the same org", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_1", name: "First", code: "DUP",
    });

    await expect(
      t.mutation(api.calendarEditions.mutations.create, {
        orgId: "org_1", name: "Second", code: "DUP",
      })
    ).rejects.toThrowError('A calendar edition with code "DUP" already exists');
  });

  it("allows the same code in different orgs", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_a", name: "Org A Edition", code: "SHARED",
    });

    const id = await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_b", name: "Org B Edition", code: "SHARED",
    });

    expect(id).toBeTruthy();
  });

  it("allows reusing code of a soft-deleted edition in the same org", async () => {
    const t = convexTest(schema, modules);

    const firstId = await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_1", name: "Old Edition", code: "REUSE",
    });

    await t.mutation(api.calendarEditions.mutations.softDelete, { id: firstId });

    const secondId = await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_1", name: "New Edition", code: "REUSE",
    });

    expect(secondId).toBeTruthy();
  });
});

describe("calendarEditions.mutations.update", () => {
  it("patches name and code on an existing edition", async () => {
    const t = convexTest(schema, modules);

    const editionId = await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_1", name: "Old Name", code: "OLD",
    });

    await t.mutation(api.calendarEditions.mutations.update, {
      id: editionId, name: "New Name", code: "NEW",
    });

    const updated = await t.run(async (ctx) => ctx.db.get(editionId));
    expect(updated!.name).toBe("New Name");
    expect(updated!.code).toBe("NEW");
  });

  it("rejects duplicate code on update within the same org", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_1", name: "Existing", code: "TAKEN",
    });

    const otherId = await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_1", name: "Other", code: "OTHER",
    });

    await expect(
      t.mutation(api.calendarEditions.mutations.update, {
        id: otherId, name: "Other", code: "TAKEN",
      })
    ).rejects.toThrowError('A calendar edition with code "TAKEN" already exists');
  });

  it("allows keeping the same code on the same edition", async () => {
    const t = convexTest(schema, modules);

    const editionId = await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_1", name: "Same Code", code: "KEEP",
    });

    await t.mutation(api.calendarEditions.mutations.update, {
      id: editionId, name: "Updated Name", code: "KEEP",
    });

    const updated = await t.run(async (ctx) => ctx.db.get(editionId));
    expect(updated!.name).toBe("Updated Name");
    expect(updated!.code).toBe("KEEP");
  });

  it("throws when edition does not exist", async () => {
    const t = convexTest(schema, modules);

    const fakeId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("calendarEditions", {
        name: "Temp", code: "TMP", orgId: "org_1",
      });
      await ctx.db.delete(id);
      return id;
    });

    await expect(
      t.mutation(api.calendarEditions.mutations.update, {
        id: fakeId, name: "Ghost", code: "GHO",
      })
    ).rejects.toThrowError("Calendar edition not found");
  });
});

describe("calendarEditions.mutations.softDelete", () => {
  it("marks the edition as deleted", async () => {
    const t = convexTest(schema, modules);

    const editionId = await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_1", name: "To Delete", code: "DEL",
    });

    await t.mutation(api.calendarEditions.mutations.softDelete, { id: editionId });

    const deleted = await t.run(async (ctx) => ctx.db.get(editionId));
    expect(deleted!.isDeleted).toBe(true);
  });

  it("soft-deleted edition no longer appears in list queries", async () => {
    const t = convexTest(schema, modules);

    const editionId = await t.mutation(api.calendarEditions.mutations.create, {
      orgId: "org_1", name: "Will Delete", code: "WD",
    });

    await t.mutation(api.calendarEditions.mutations.softDelete, { id: editionId });

    const results = await t.query(api.calendarEditions.queries.list, { orgId: "org_1" });
    expect(results).toHaveLength(0);
  });
});
