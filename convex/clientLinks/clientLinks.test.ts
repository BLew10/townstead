import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("clientLinks", () => {
  it("tenant isolation — listByOrg only returns links for the authenticated org", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactA = await ctx.db.insert("contacts", {
        company: "A Corp",
        firstName: "Alice",
        lastName: "A",
        orgId: "org_a",
      });
      const contactB = await ctx.db.insert("contacts", {
        company: "B Corp",
        firstName: "Bob",
        lastName: "B",
        orgId: "org_b",
      });
      await ctx.db.insert("clientLinks", {
        userId: "user_a",
        contactId: contactA,
        orgId: "org_a",
      });
      await ctx.db.insert("clientLinks", {
        userId: "user_b",
        contactId: contactB,
        orgId: "org_b",
      });
    });

    const asOrgA = t.withIdentity({ name: "Admin", orgId: "org_a" });
    const results = await asOrgA.query(api.clientLinks.queries.listByOrg, {});
    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe("user_a");
  });

  it("create and remove a client link", async () => {
    const t = convexTest(schema, modules);

    const contactId = await t.run(async (ctx) => {
      return await ctx.db.insert("contacts", {
        company: "Test Corp",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
    });

    const asOrg1 = t.withIdentity({ name: "Admin", orgId: "org_1" });

    const linkId = await asOrg1.mutation(api.clientLinks.mutations.create, {
      userId: "user_123",
      contactId,
    });
    expect(linkId).toBeTruthy();

    const byUser = await t.query(api.clientLinks.queries.getByUserId, {
      userId: "user_123",
    });
    expect(byUser).not.toBeNull();
    expect(byUser!.contactId).toEqual(contactId);

    const byContact = await asOrg1.query(
      api.clientLinks.queries.getByContactId,
      { contactId }
    );
    expect(byContact).not.toBeNull();
    expect(byContact!.userId).toBe("user_123");

    await asOrg1.mutation(api.clientLinks.mutations.remove, { id: linkId });

    const afterRemove = await t.query(api.clientLinks.queries.getByUserId, {
      userId: "user_123",
    });
    expect(afterRemove).toBeNull();
  });

  it("create rejects duplicate contact link", async () => {
    const t = convexTest(schema, modules);

    const contactId = await t.run(async (ctx) => {
      return await ctx.db.insert("contacts", {
        company: "Dup Corp",
        firstName: "Dup",
        lastName: "Test",
        orgId: "org_1",
      });
    });

    const asOrg1 = t.withIdentity({ name: "Admin", orgId: "org_1" });

    await asOrg1.mutation(api.clientLinks.mutations.create, {
      userId: "user_first",
      contactId,
    });

    await expect(
      asOrg1.mutation(api.clientLinks.mutations.create, {
        userId: "user_second",
        contactId,
      })
    ).rejects.toThrowError("already has a linked client account");
  });

  it("create rejects duplicate userId within same org", async () => {
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

    const asOrg1 = t.withIdentity({ name: "Admin", orgId: "org_1" });

    await asOrg1.mutation(api.clientLinks.mutations.create, {
      userId: "user_same",
      contactId: contact1,
    });

    await expect(
      asOrg1.mutation(api.clientLinks.mutations.create, {
        userId: "user_same",
        contactId: contact2,
      })
    ).rejects.toThrowError("already linked to another contact");
  });

  it("getByContactId returns null for link belonging to different org", async () => {
    const t = convexTest(schema, modules);

    const contactId = await t.run(async (ctx) => {
      const cId = await ctx.db.insert("contacts", {
        company: "Other",
        firstName: "X",
        lastName: "Y",
        orgId: "org_b",
      });
      await ctx.db.insert("clientLinks", {
        userId: "user_x",
        contactId: cId,
        orgId: "org_b",
      });
      return cId;
    });

    const asOrgA = t.withIdentity({ name: "Admin", orgId: "org_a" });
    const result = await asOrgA.query(
      api.clientLinks.queries.getByContactId,
      { contactId }
    );
    expect(result).toBeNull();
  });
});
