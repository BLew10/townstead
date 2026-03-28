import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

const ORG = "test_org";

describe("listPayments", () => {
  it("returns enriched payments with contact info, sorted by date desc", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Acme Inc",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@acme.com",
        orgId: ORG,
        isDeleted: false,
        searchText: "Acme Inc Jane Doe",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        invoiceNumber: "26-0001",
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 5000,
        date: new Date(2026, 0, 10).getTime(),
        method: "check",
        checkNumber: "1234",
        orgId: ORG,
      });
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 3000,
        date: new Date(2026, 1, 15).getTime(),
        method: "credit",
        orgId: ORG,
      });
    });

    const results = await t.query(api.billing.queries.listPayments, {
      orgId: ORG,
    });

    expect(results).toHaveLength(2);
    expect(results[0].amount).toBe(3000);
    expect(results[0].contactName).toBe("Jane Doe");
    expect(results[0].company).toBe("Acme Inc");
    expect(results[0].invoiceNumber).toBe("26-0001");
    expect(results[0].contactEmail).toBe("jane@acme.com");
    expect(results[0].method).toBe("credit");

    expect(results[1].amount).toBe(5000);
    expect(results[1].method).toBe("check");
    expect(results[1].checkNumber).toBe("1234");
    expect(results[1].contactName).toBe("Jane Doe");
  });

  it("filters payments by year when year arg is provided", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Acme",
        firstName: "Jane",
        lastName: "Doe",
        orgId: ORG,
        isDeleted: false,
        searchText: "Acme Jane Doe",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 5000,
        date: new Date(2026, 5, 15).getTime(),
        orgId: ORG,
      });
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 3000,
        date: new Date(2025, 11, 15).getTime(),
        orgId: ORG,
      });
    });

    const results = await t.query(api.billing.queries.listPayments, {
      orgId: ORG,
      year: 2026,
    });

    expect(results).toHaveLength(1);
    expect(results[0].amount).toBe(5000);
  });

  it("returns all payments across years when no year filter", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Acme",
        firstName: "Jane",
        lastName: "Doe",
        orgId: ORG,
        isDeleted: false,
        searchText: "Acme Jane Doe",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 5000,
        date: new Date(2026, 5, 15).getTime(),
        orgId: ORG,
      });
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 3000,
        date: new Date(2025, 11, 15).getTime(),
        orgId: ORG,
      });
    });

    const results = await t.query(api.billing.queries.listPayments, {
      orgId: ORG,
    });

    expect(results).toHaveLength(2);
    expect(results[0].amount).toBe(5000);
    expect(results[1].amount).toBe(3000);
  });

  it("isolates payments by orgId", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Other Co",
        firstName: "Bob",
        lastName: "Jones",
        orgId: "org_other",
        isDeleted: false,
        searchText: "Other Co Bob Jones",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: "org_other",
        isDeleted: false,
      });
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 9900,
        date: new Date(2026, 0, 10).getTime(),
        orgId: "org_other",
      });
    });

    const results = await t.query(api.billing.queries.listPayments, {
      orgId: ORG,
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty array when no payments exist", async () => {
    const t = convexTest(schema, modules);

    const results = await t.query(api.billing.queries.listPayments, {
      orgId: ORG,
    });
    expect(results).toHaveLength(0);
  });

  it("shows 'Unknown' contactName when purchase has no contact", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Ghost Co",
        firstName: "Ghost",
        lastName: "User",
        orgId: ORG,
        isDeleted: false,
        searchText: "Ghost Co Ghost User",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 2500,
        date: new Date(2026, 3, 1).getTime(),
        orgId: ORG,
      });
      await ctx.db.delete(contactId);
    });

    const results = await t.query(api.billing.queries.listPayments, {
      orgId: ORG,
    });
    expect(results).toHaveLength(1);
    expect(results[0].contactName).toBe("Unknown");
    expect(results[0].company).toBe("");
    expect(results[0].contactEmail).toBeNull();
  });
});

describe("getInvoiceData", () => {
  it("returns payments sorted by date in the response", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Acme",
        firstName: "Jane",
        lastName: "Doe",
        orgId: ORG,
        isDeleted: false,
        searchText: "Acme Jane Doe",
      });
      const editionId = await ctx.db.insert("calendarEditions", {
        name: "Elk Grove",
        code: "EG",
        orgId: ORG,
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [editionId],
        year: 2026,
        invoiceNumber: "26-0001",
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 120000,
        orgId: ORG,
      });
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 5000,
        date: new Date(2026, 2, 15).getTime(),
        method: "check",
        orgId: ORG,
      });
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 3000,
        date: new Date(2026, 0, 10).getTime(),
        method: "credit",
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(api.billing.queries.getInvoiceData, {
      purchaseId: ids.purchaseId,
      orgId: ORG,
      now: 1710000000000,
    });

    expect(result).not.toBeNull();
    expect(result!.payments).toHaveLength(2);
    expect(result!.payments[0].amount).toBe(3000);
    expect(result!.payments[1].amount).toBe(5000);
  });

  it("returns enriched scheduled payments with paidAmount and isLate", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Co",
        firstName: "John",
        lastName: "Smith",
        orgId: ORG,
        isDeleted: false,
        searchText: "Test Co John Smith",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        invoiceNumber: "26-0002",
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 60000,
        orgId: ORG,
      });
      const sp1 = await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2025, 0, 1).getTime(),
        amount: 30000,
        month: 1,
        year: 2025,
        orgId: ORG,
      });
      const sp2 = await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2099, 6, 1).getTime(),
        amount: 30000,
        month: 7,
        year: 2099,
        orgId: ORG,
      });
      const paymentId = await ctx.db.insert("payments", {
        purchaseId,
        amount: 30000,
        date: new Date(2025, 0, 5).getTime(),
        orgId: ORG,
      });
      await ctx.db.insert("paymentAllocations", {
        paymentId,
        scheduledPaymentId: sp1,
        amount: 30000,
        orgId: ORG,
      });
      return { purchaseId, sp1, sp2 };
    });

    const result = await t.query(api.billing.queries.getInvoiceData, {
      purchaseId: ids.purchaseId,
      orgId: ORG,
      now: 1710000000000,
    });

    expect(result).not.toBeNull();
    expect(result!.scheduledPayments).toHaveLength(2);

    const first = result!.scheduledPayments[0];
    expect(first.paidAmount).toBe(30000);
    expect(first.isLate).toBe(false);

    const second = result!.scheduledPayments[1];
    expect(second.paidAmount).toBe(0);
    expect(second.isLate).toBe(false);

    expect(result!.amountPaid).toBe(30000);
    expect(result!.balance).toBe(30000);
  });

  it("returns null for deleted purchase", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Co",
        firstName: "X",
        lastName: "Y",
        orgId: ORG,
        isDeleted: false,
        searchText: "Test Co X Y",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
        isDeleted: true,
      });
      return { purchaseId };
    });

    const result = await t.query(api.billing.queries.getInvoiceData, {
      purchaseId: ids.purchaseId,
      orgId: ORG,
      now: 1710000000000,
    });
    expect(result).toBeNull();
  });

  it("tenant isolation — wrong org gets null", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Org A Co",
        firstName: "X",
        lastName: "Y",
        orgId: "org_a",
        isDeleted: false,
        searchText: "Org A Co X Y",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: "org_a",
        isDeleted: false,
      });
      return { purchaseId };
    });

    const result = await t.query(api.billing.queries.getInvoiceData, {
      purchaseId: ids.purchaseId,
      orgId: "org_b",
      now: 1710000000000,
    });
    expect(result).toBeNull();
  });

  it("uses adPurchases.charge as fallback when adPricing is absent", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Charge Co",
        firstName: "X",
        lastName: "Y",
        orgId: ORG,
        isDeleted: false,
        searchText: "Charge Co X Y",
      });
      const editionId = await ctx.db.insert("calendarEditions", {
        name: "Test",
        code: "T",
        orgId: ORG,
      });
      const adId = await ctx.db.insert("advertisements", {
        name: "Premium Display",
        isDayType: false,
        slotsPerMonth: 1,
        orgId: ORG,
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [editionId],
        year: 2026,
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 144000,
        orgId: ORG,
      });
      await ctx.db.insert("adPurchases", {
        purchaseId,
        advertisementId: adId,
        calendarEditionId: editionId,
        quantity: 12,
        charge: 144000,
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(api.billing.queries.getInvoiceData, {
      purchaseId: ids.purchaseId,
      orgId: ORG,
      now: 1710000000000,
    });

    expect(result).not.toBeNull();
    expect(result!.lineItems).toHaveLength(1);
    expect(result!.lineItems[0].total).toBe(144000);
    expect(result!.lineItems[0].unitPrice).toBe(12000);
  });
});

describe("getStatementDataByPurchase", () => {
  it("returns null for non-existent purchase", async () => {
    const t = convexTest(schema, modules);

    const fakePurchaseId = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Co",
        firstName: "Test",
        lastName: "User",
        orgId: ORG,
      });
      const id = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
        isDeleted: true,
      });
      return id;
    });

    const result = await t.query(
      api.billing.queries.getStatementDataByPurchase,
      { purchaseId: fakePurchaseId, orgId: ORG, now: 1710000000000 }
    );

    expect(result).toBeNull();
  });

  it("tenant isolation — org B cannot see org A data", async () => {
    const t = convexTest(schema, modules);

    const purchaseId = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Org A Corp",
        firstName: "Alice",
        lastName: "A",
        orgId: "org_a",
      });
      return await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: "org_a",
      });
    });

    const result = await t.query(
      api.billing.queries.getStatementDataByPurchase,
      { purchaseId, orgId: "org_b", now: 1710000000000 }
    );

    expect(result).toBeNull();
  });

  it("returns starting balance and empty ledger when no payments or late fees", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Simple Corp",
        firstName: "Bob",
        lastName: "Simple",
        orgId: ORG,
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        invoiceNumber: "26-0001",
        orgId: ORG,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 100000,
        orgId: ORG,
      });
      const spId = await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2027, 0, 1).getTime(),
        amount: 100000,
        month: 1,
        year: 2027,
        orgId: ORG,
      });
      return { purchaseId, spId };
    });

    const result = await t.query(
      api.billing.queries.getStatementDataByPurchase,
      { purchaseId: ids.purchaseId, orgId: ORG, now: 1710000000000 }
    );

    expect(result).not.toBeNull();
    expect(result!.invoiceNumber).toBe("26-0001");
    expect(result!.startingBalance).toBe(100000);
    expect(result!.ledgerEntries).toHaveLength(0);
    expect(result!.balance).toBe(100000);
  });

  it("includes payment ledger entries and deducts from balance", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Paid Corp",
        firstName: "Carol",
        lastName: "Payer",
        orgId: ORG,
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 100000,
        orgId: ORG,
      });
      const spId = await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2027, 0, 1).getTime(),
        amount: 100000,
        month: 1,
        year: 2027,
        orgId: ORG,
      });
      const paymentId = await ctx.db.insert("payments", {
        purchaseId,
        amount: 30000,
        date: new Date(2026, 5, 15).getTime(),
        method: "check",
        checkNumber: "5678",
        orgId: ORG,
      });
      await ctx.db.insert("paymentAllocations", {
        paymentId,
        scheduledPaymentId: spId,
        amount: 30000,
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(
      api.billing.queries.getStatementDataByPurchase,
      { purchaseId: ids.purchaseId, orgId: ORG, now: 1710000000000 }
    );

    expect(result).not.toBeNull();
    expect(result!.ledgerEntries).toHaveLength(1);
    expect(result!.ledgerEntries[0].type).toBe("payment");
    expect(result!.ledgerEntries[0].amount).toBe(30000);
    expect(result!.ledgerEntries[0].description).toContain("check");
    expect(result!.balance).toBe(70000);
  });

  it("excludes prepaid payments from ledger entries", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Prepaid Corp",
        firstName: "Dan",
        lastName: "Prepay",
        orgId: ORG,
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 100000,
        orgId: ORG,
      });
      await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2027, 0, 1).getTime(),
        amount: 100000,
        month: 1,
        year: 2027,
        orgId: ORG,
      });
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 20000,
        date: new Date(2026, 0, 1).getTime(),
        isPrepaid: true,
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(
      api.billing.queries.getStatementDataByPurchase,
      { purchaseId: ids.purchaseId, orgId: ORG, now: 1710000000000 }
    );

    expect(result).not.toBeNull();
    expect(result!.ledgerEntries).toHaveLength(0);
  });
});
