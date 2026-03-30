import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

const _factory = () => convexTest(schema, modules);
type TestInstance = ReturnType<typeof _factory>;

async function storeTestFile(t: TestInstance) {
  return await t.run(async (ctx) => {
    return await ctx.storage.store(new Blob(["test-content"]));
  });
}

describe("clientAssets", () => {
  it("upload creates an asset with uploaded status and listByContact returns it", async () => {
    const t = convexTest(schema, modules);

    const fileId = await storeTestFile(t);
    const contactId = await t.run(async (ctx) => {
      return await ctx.db.insert("contacts", {
        company: "Acme",
        firstName: "Jane",
        lastName: "Doe",
        orgId: "org_1",
      });
    });

    const asOrg1 = t.withIdentity({ name: "Admin", orgId: "org_1" });

    const assetId = await asOrg1.mutation(api.clientAssets.mutations.upload, {
      contactId,
      fileId,
      fileName: "banner.jpg",
    });
    expect(assetId).toBeTruthy();

    const assets = await asOrg1.query(
      api.clientAssets.queries.listByContact,
      { contactId }
    );
    expect(assets).toHaveLength(1);
    expect(assets[0].fileName).toBe("banner.jpg");
    expect(assets[0].status).toBe("uploaded");
  });

  it("review updates status and feedback", async () => {
    const t = convexTest(schema, modules);

    const fileId = await storeTestFile(t);
    const { contactId, assetId } = await t.run(async (ctx) => {
      const cId = await ctx.db.insert("contacts", {
        company: "Corp",
        firstName: "Bob",
        lastName: "Smith",
        orgId: "org_1",
      });
      const aId = await ctx.db.insert("clientAssets", {
        contactId: cId,
        fileId,
        fileName: "ad.png",
        status: "uploaded",
        orgId: "org_1",
      });
      return { contactId: cId, assetId: aId };
    });

    const asOrg1 = t.withIdentity({ name: "Admin", orgId: "org_1" });

    await asOrg1.mutation(api.clientAssets.mutations.review, {
      id: assetId,
      status: "approved",
      feedback: "Looks great!",
    });

    const doc = await t.run(async (ctx) => ctx.db.get(assetId));
    expect(doc!.status).toBe("approved");
    expect(doc!.feedback).toBe("Looks great!");
  });

  it("review rejects asset from different org", async () => {
    const t = convexTest(schema, modules);

    const fileId = await storeTestFile(t);
    const assetId = await t.run(async (ctx) => {
      const cId = await ctx.db.insert("contacts", {
        company: "Other",
        firstName: "X",
        lastName: "Y",
        orgId: "org_b",
      });
      return await ctx.db.insert("clientAssets", {
        contactId: cId,
        fileId,
        fileName: "file.pdf",
        status: "uploaded",
        orgId: "org_b",
      });
    });

    const asOrgA = t.withIdentity({ name: "Admin", orgId: "org_a" });

    await expect(
      asOrgA.mutation(api.clientAssets.mutations.review, {
        id: assetId,
        status: "rejected",
      })
    ).rejects.toThrowError("Not found");
  });
});
