import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

describe("messages", () => {
  it("send rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules);

    const contactId = await t.run(async (ctx) => {
      return await ctx.db.insert("contacts", {
        company: "Acme",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
    });

    await expect(
      t.mutation(api.messages.mutations.send, {
        contactId,
        content: "Hello",
        senderRole: "admin",
      })
    ).rejects.toThrowError("Not authenticated");
  });

  it("send creates a message and listByContact returns it", async () => {
    const t = convexTest(schema, modules);

    const contactId = await t.run(async (ctx) => {
      return await ctx.db.insert("contacts", {
        company: "Acme",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
    });

    const asAdmin = t.withIdentity({ name: "Admin", orgId: "org_1" });

    const msgId = await asAdmin.mutation(api.messages.mutations.send, {
      contactId,
      content: "Hello from admin",
      senderRole: "admin",
    });
    expect(msgId).toBeTruthy();

    const messages = await asAdmin.query(
      api.messages.queries.listByContact,
      { contactId }
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("Hello from admin");
    expect(messages[0].senderRole).toBe("admin");
    expect(messages[0].orgId).toBe("org_1");
  });

  it("tenant isolation — send rejects contact from different org", async () => {
    const t = convexTest(schema, modules);

    const contactId = await t.run(async (ctx) => {
      return await ctx.db.insert("contacts", {
        company: "Other Corp",
        firstName: "Bob",
        lastName: "Smith",
        orgId: "org_b",
      });
    });

    const asOrgA = t.withIdentity({ name: "Admin", orgId: "org_a" });

    await expect(
      asOrgA.mutation(api.messages.mutations.send, {
        contactId,
        content: "Cross-org message",
        senderRole: "admin",
      })
    ).rejects.toThrowError("Contact not found");
  });

  it("listByContact rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules);

    const contactId = await t.run(async (ctx) => {
      return await ctx.db.insert("contacts", {
        company: "Test",
        firstName: "A",
        lastName: "B",
        orgId: "org_1",
      });
    });

    await expect(
      t.query(api.messages.queries.listByContact, { contactId })
    ).rejects.toThrowError("Not authenticated");
  });
});
