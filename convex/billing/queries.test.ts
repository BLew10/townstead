import { convexTest, type TestConvex } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

const ORG = "test_org";
const NOW = 1710000000000;

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
      const purchase2026 = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
        isDeleted: false,
      });
      const purchase2025 = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2025,
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("payments", {
        purchaseId: purchase2026,
        amount: 5000,
        date: new Date(2026, 5, 15).getTime(),
        orgId: ORG,
      });
      await ctx.db.insert("payments", {
        purchaseId: purchase2025,
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

  it("counts unallocated prepaid payments in amountPaid and reduces balance", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Prepaid Co",
        firstName: "Scott",
        lastName: "Sweeney",
        orgId: ORG,
        isDeleted: false,
        searchText: "Prepaid Co Scott Sweeney",
      });
      const editionId = await ctx.db.insert("calendarEditions", {
        name: "Elk Grove",
        code: "EG",
        orgId: ORG,
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [editionId],
        year: 2025,
        invoiceNumber: "250001",
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 1444800,
        discount1: 494800,
        orgId: ORG,
      });
      const spId = await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2025, 6, 1).getTime(),
        amount: 950000,
        month: 7,
        year: 2025,
        orgId: ORG,
      });
      // Prepaid payment exists but has NO allocations (migration data)
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 950000,
        date: new Date(2024, 11, 1).getTime(),
        isPrepaid: true,
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(api.billing.queries.getInvoiceData, {
      purchaseId: ids.purchaseId,
      orgId: ORG,
      now: new Date(2025, 3, 1).getTime(),
    });

    expect(result).not.toBeNull();
    expect(result!.net).toBe(950000);
    expect(result!.prepaidAmount).toBe(950000);
    expect(result!.amountPaid).toBe(950000);
    expect(result!.balance).toBe(0);
  });

  it("does not double-count prepaid payments that have allocations", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Allocated Co",
        firstName: "Jane",
        lastName: "Doe",
        orgId: ORG,
        isDeleted: false,
        searchText: "Allocated Co Jane Doe",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
        isDeleted: false,
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
        amount: 50000,
        date: new Date(2026, 0, 1).getTime(),
        isPrepaid: true,
        orgId: ORG,
      });
      await ctx.db.insert("paymentAllocations", {
        paymentId,
        scheduledPaymentId: spId,
        amount: 50000,
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(api.billing.queries.getInvoiceData, {
      purchaseId: ids.purchaseId,
      orgId: ORG,
      now: new Date(2026, 3, 1).getTime(),
    });

    expect(result).not.toBeNull();
    expect(result!.prepaidAmount).toBe(50000);
    expect(result!.amountPaid).toBe(50000);
    expect(result!.balance).toBe(50000);
  });

  it("returns editionCodes with all edition codes joined for multi-edition purchase", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Multi Edition Co",
        firstName: "Jane",
        lastName: "Doe",
        orgId: ORG,
        isDeleted: false,
        searchText: "Multi Edition Co Jane Doe",
      });
      const ed1 = await ctx.db.insert("calendarEditions", {
        name: "Elk Grove",
        code: "EG",
        orgId: ORG,
      });
      const ed2 = await ctx.db.insert("calendarEditions", {
        name: "Sacramento",
        code: "SAC",
        orgId: ORG,
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [ed1, ed2],
        year: 2026,
        invoiceNumber: "26-0010",
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 100000,
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(api.billing.queries.getInvoiceData, {
      purchaseId: ids.purchaseId,
      orgId: ORG,
      now: NOW,
    });

    expect(result).not.toBeNull();
    expect(result!.editionCodes).toBe("EG, SAC");
  });

  it("returns single edition code for single-edition purchase", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Single Co",
        firstName: "John",
        lastName: "Solo",
        orgId: ORG,
        isDeleted: false,
        searchText: "Single Co John Solo",
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
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 50000,
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(api.billing.queries.getInvoiceData, {
      purchaseId: ids.purchaseId,
      orgId: ORG,
      now: NOW,
    });

    expect(result).not.toBeNull();
    expect(result!.editionCodes).toBe("EG");
  });

  it("returns 'Unknown' editionCodes when purchase has no editions", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "No Ed Co",
        firstName: "X",
        lastName: "Y",
        orgId: ORG,
        isDeleted: false,
        searchText: "No Ed Co X Y",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 50000,
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(api.billing.queries.getInvoiceData, {
      purchaseId: ids.purchaseId,
      orgId: ORG,
      now: NOW,
    });

    expect(result).not.toBeNull();
    expect(result!.editionCodes).toBe("Unknown");
  });

  it("uses edition code (not name) for line item calendarName", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Code Co",
        firstName: "X",
        lastName: "Y",
        orgId: ORG,
        isDeleted: false,
        searchText: "Code Co X Y",
      });
      const editionId = await ctx.db.insert("calendarEditions", {
        name: "Elk Grove",
        code: "EG",
        orgId: ORG,
      });
      const adId = await ctx.db.insert("advertisements", {
        name: "Full Page",
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
        totalSale: 120000,
        orgId: ORG,
      });
      await ctx.db.insert("adPurchases", {
        purchaseId,
        advertisementId: adId,
        calendarEditionId: editionId,
        quantity: 12,
        charge: 120000,
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(api.billing.queries.getInvoiceData, {
      purchaseId: ids.purchaseId,
      orgId: ORG,
      now: NOW,
    });

    expect(result).not.toBeNull();
    expect(result!.lineItems).toHaveLength(1);
    expect(result!.lineItems[0].calendarName).toBe("EG");
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
  it("returns all edition codes in editionName and editionCodes", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Multi Ed Corp",
        firstName: "Carol",
        lastName: "Multi",
        orgId: ORG,
      });
      const ed1 = await ctx.db.insert("calendarEditions", {
        name: "Elk Grove",
        code: "EG",
        orgId: ORG,
      });
      const ed2 = await ctx.db.insert("calendarEditions", {
        name: "Sacramento",
        code: "SAC",
        orgId: ORG,
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [ed1, ed2],
        year: 2026,
        invoiceNumber: "26-0050",
        orgId: ORG,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 80000,
        orgId: ORG,
      });
      await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2027, 0, 1).getTime(),
        amount: 80000,
        month: 1,
        year: 2027,
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(
      api.billing.queries.getStatementDataByPurchase,
      { purchaseId: ids.purchaseId, orgId: ORG, now: NOW }
    );

    expect(result).not.toBeNull();
    expect(result!.editionName).toBe("EG, SAC");
    expect(result!.editionCodes).toBe("EG, SAC");
  });

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

  it("does not double-count late unpaid installment in totalAmountDue (BUG 1 regression)", async () => {
    const t = convexTest(schema, modules);
    const FUTURE_NOW = new Date(2026, 5, 1).getTime();

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Late Corp",
        firstName: "Eve",
        lastName: "Late",
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
        lateFeeType: "flat" as const,
        lateFeeAmount: 2500,
        orgId: ORG,
      });
      // One past-due unpaid installment (before FUTURE_NOW)
      await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2026, 0, 1).getTime(),
        amount: 50000,
        month: 1,
        year: 2026,
        orgId: ORG,
      });
      // One future unpaid installment (after FUTURE_NOW)
      await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2099, 6, 1).getTime(),
        amount: 50000,
        month: 7,
        year: 2099,
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(
      api.billing.queries.getStatementDataByPurchase,
      { purchaseId: ids.purchaseId, orgId: ORG, now: FUTURE_NOW }
    );

    expect(result).not.toBeNull();
    // pastDueAmount = 50000 (unpaid) + 2500 (late fee) = 52500
    expect(result!.pastDueAmount).toBe(52500);
    // nextPaymentAmount should be the FUTURE one (50000), not the late one again
    expect(result!.nextPaymentAmount).toBe(50000);
    // totalAmountDue should NOT double-count the late installment
    expect(result!.totalAmountDue).toBe(102500);
  });

  it("does not double-count when only late installments exist", async () => {
    const t = convexTest(schema, modules);
    const FUTURE_NOW = new Date(2026, 5, 1).getTime();

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "All Late Corp",
        firstName: "Frank",
        lastName: "Overdue",
        orgId: ORG,
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2025,
        orgId: ORG,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 50000,
        lateFeeType: "flat" as const,
        lateFeeAmount: 2500,
        orgId: ORG,
      });
      await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2025, 0, 1).getTime(),
        amount: 50000,
        month: 1,
        year: 2025,
        orgId: ORG,
      });
      return { purchaseId };
    });

    const result = await t.query(
      api.billing.queries.getStatementDataByPurchase,
      { purchaseId: ids.purchaseId, orgId: ORG, now: FUTURE_NOW }
    );

    expect(result).not.toBeNull();
    expect(result!.pastDueAmount).toBe(52500);
    // No future installment, nextPaymentAmount should be 0
    expect(result!.nextPaymentAmount).toBe(0);
    expect(result!.totalAmountDue).toBe(52500);
  });

  it("includes unallocated prepaid in balance (BUG 2 regression)", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Prepaid Statement Corp",
        firstName: "Grace",
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
        amount: 40000,
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
    // Balance should reflect unallocated prepaid: 100000 - 40000 = 60000
    expect(result!.balance).toBe(60000);
  });

  it("sums multiple prepaid payments (BUG 7 regression)", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Multi Prepaid Corp",
        firstName: "Hank",
        lastName: "Multi",
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
        amount: 25000,
        date: new Date(2025, 6, 1).getTime(),
        isPrepaid: true,
        orgId: ORG,
      });
      await ctx.db.insert("payments", {
        purchaseId,
        amount: 15000,
        date: new Date(2025, 9, 1).getTime(),
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
    // Both prepaid payments (25000 + 15000 = 40000) should be counted
    expect(result!.balance).toBe(60000);
    // startingBalance should subtract both prepaids from net
    expect(result!.startingBalance).toBe(net_minus_prepaids());

    function net_minus_prepaids() {
      // net = 100000, no late fees, startingBalance = net - lateFees + prepaidTotal
      // = 100000 - 0 + 40000 = 140000
      return 140000;
    }
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

describe("getStatementData", () => {
  it("returns all edition codes joined for purchase and payment rows", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Multi Corp",
        firstName: "Alice",
        lastName: "Multi",
        orgId: ORG,
        isDeleted: false,
        searchText: "Multi Corp Alice Multi",
      });
      const ed1 = await ctx.db.insert("calendarEditions", {
        name: "Elk Grove",
        code: "EG",
        orgId: ORG,
      });
      const ed2 = await ctx.db.insert("calendarEditions", {
        name: "Sacramento",
        code: "SAC",
        orgId: ORG,
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [ed1, ed2],
        year: 2026,
        orgId: ORG,
        isDeleted: false,
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
        amount: 25000,
        date: new Date(2026, 3, 1).getTime(),
        method: "check",
        orgId: ORG,
      });
      return { contactId };
    });

    const result = await t.query(api.billing.queries.getStatementData, {
      contactId: ids.contactId,
      orgId: ORG,
      now: NOW,
    });

    expect(result).not.toBeNull();
    expect(result!.purchases[0].editionName).toBe("EG, SAC");
    expect(result!.payments[0].editionName).toBe("EG, SAC");
  });

  it("returns 'Unknown' editionName when purchase has no editions", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Empty Ed Corp",
        firstName: "Bob",
        lastName: "None",
        orgId: ORG,
        isDeleted: false,
        searchText: "Empty Ed Corp Bob None",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
        isDeleted: false,
      });
      await ctx.db.insert("paymentTerms", {
        purchaseId,
        totalSale: 50000,
        orgId: ORG,
      });
      return { contactId };
    });

    const result = await t.query(api.billing.queries.getStatementData, {
      contactId: ids.contactId,
      orgId: ORG,
      now: NOW,
    });

    expect(result).not.toBeNull();
    expect(result!.purchases[0].editionName).toBe("Unknown");
  });

  it("includes unallocated prepaid in per-purchase balance (BUG 2 regression)", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Statement Prepaid Corp",
        firstName: "Ivy",
        lastName: "Stmt",
        orgId: ORG,
        isDeleted: false,
        searchText: "Statement Prepaid Corp Ivy Stmt",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
        isDeleted: false,
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
        amount: 30000,
        date: new Date(2026, 0, 1).getTime(),
        isPrepaid: true,
        orgId: ORG,
      });
      return { contactId, purchaseId };
    });

    const result = await t.query(api.billing.queries.getStatementData, {
      contactId: ids.contactId,
      orgId: ORG,
      now: NOW,
    });

    expect(result).not.toBeNull();
    expect(result!.purchases).toHaveLength(1);
    expect(result!.purchases[0].amountPaid).toBe(30000);
    expect(result!.purchases[0].balance).toBe(70000);
    expect(result!.overallBalance).toBe(70000);
  });
});

describe("listThisMonth", () => {
  const MARCH_2026 = new Date(2026, 2, 15).getTime();

  type TestInstance = TestConvex<typeof schema>;

  async function seedContact(t: TestInstance, orgId = ORG) {
    return await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Test Co",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@test.com",
        orgId,
        isDeleted: false,
        searchText: "Test Co Jane Doe",
      });
      return contactId;
    });
  }

  async function seedPurchaseWithSchedule(
    t: TestInstance,
    contactId: any,
    sp: { dueDate: number; amount: number; month: number; year: number },
    orgId = ORG
  ) {
    return await t.run(async (ctx) => {
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: sp.year,
        invoiceNumber: `${sp.year}-0001`,
        orgId,
        isDeleted: false,
      });
      const spId = await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: sp.dueDate,
        amount: sp.amount,
        month: sp.month,
        year: sp.year,
        orgId,
      });
      return { purchaseId, spId };
    });
  }

  it("excludes fully paid past-month items (regression)", async () => {
    const t = convexTest(schema, modules);
    const contactId = await seedContact(t);

    const { spId } = await seedPurchaseWithSchedule(t, contactId, {
      dueDate: new Date(2024, 6, 15).getTime(),
      amount: 50000,
      month: 7,
      year: 2024,
    });

    await t.run(async (ctx) => {
      const paymentId = await ctx.db.insert("payments", {
        purchaseId: (await ctx.db.get(spId))!.purchaseId,
        amount: 50000,
        date: new Date(2024, 6, 10).getTime(),
        orgId: ORG,
      });
      await ctx.db.insert("paymentAllocations", {
        paymentId,
        scheduledPaymentId: spId,
        amount: 50000,
        orgId: ORG,
      });
    });

    const results = await t.query(api.billing.queries.listThisMonth, {
      orgId: ORG,
      now: MARCH_2026,
    });

    expect(results).toHaveLength(0);
  });

  it("includes unpaid overdue items from past months", async () => {
    const t = convexTest(schema, modules);
    const contactId = await seedContact(t);

    await seedPurchaseWithSchedule(t, contactId, {
      dueDate: new Date(2024, 6, 15).getTime(),
      amount: 50000,
      month: 7,
      year: 2024,
    });

    const results = await t.query(api.billing.queries.listThisMonth, {
      orgId: ORG,
      now: MARCH_2026,
    });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("overdue");
    expect(results[0].amount).toBe(50000);
  });

  it("includes current month items regardless of status", async () => {
    const t = convexTest(schema, modules);
    const contactId = await seedContact(t);

    const { spId } = await seedPurchaseWithSchedule(t, contactId, {
      dueDate: new Date(2026, 2, 1).getTime(),
      amount: 30000,
      month: 3,
      year: 2026,
    });

    await t.run(async (ctx) => {
      const paymentId = await ctx.db.insert("payments", {
        purchaseId: (await ctx.db.get(spId))!.purchaseId,
        amount: 30000,
        date: new Date(2026, 2, 1).getTime(),
        orgId: ORG,
      });
      await ctx.db.insert("paymentAllocations", {
        paymentId,
        scheduledPaymentId: spId,
        amount: 30000,
        orgId: ORG,
      });
    });

    const results = await t.query(api.billing.queries.listThisMonth, {
      orgId: ORG,
      now: MARCH_2026,
    });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("paid");
  });

  it("excludes future months from current year", async () => {
    const t = convexTest(schema, modules);
    const contactId = await seedContact(t);

    await seedPurchaseWithSchedule(t, contactId, {
      dueDate: new Date(2026, 5, 1).getTime(),
      amount: 40000,
      month: 6,
      year: 2026,
    });

    const results = await t.query(api.billing.queries.listThisMonth, {
      orgId: ORG,
      now: MARCH_2026,
    });

    expect(results).toHaveLength(0);
  });

  it("tenant isolation — org B cannot see org A data", async () => {
    const t = convexTest(schema, modules);
    const contactId = await seedContact(t);

    await seedPurchaseWithSchedule(t, contactId, {
      dueDate: new Date(2026, 2, 1).getTime(),
      amount: 50000,
      month: 3,
      year: 2026,
    });

    const results = await t.query(api.billing.queries.listThisMonth, {
      orgId: "org_other",
      now: MARCH_2026,
    });

    expect(results).toHaveLength(0);
  });

  it("excludes deleted purchases", async () => {
    const t = convexTest(schema, modules);
    const contactId = await seedContact(t);

    await t.run(async (ctx) => {
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [],
        year: 2026,
        orgId: ORG,
        isDeleted: true,
      });
      await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2026, 2, 1).getTime(),
        amount: 50000,
        month: 3,
        year: 2026,
        orgId: ORG,
      });
    });

    const results = await t.query(api.billing.queries.listThisMonth, {
      orgId: ORG,
      now: MARCH_2026,
    });

    expect(results).toHaveLength(0);
  });

  it("returns empty array when no scheduled payments exist", async () => {
    const t = convexTest(schema, modules);

    const results = await t.query(api.billing.queries.listThisMonth, {
      orgId: ORG,
      now: MARCH_2026,
    });

    expect(results).toHaveLength(0);
  });

  it("sorts results by dueDate ascending", async () => {
    const t = convexTest(schema, modules);
    const contactId = await seedContact(t);

    await seedPurchaseWithSchedule(t, contactId, {
      dueDate: new Date(2026, 2, 20).getTime(),
      amount: 20000,
      month: 3,
      year: 2026,
    });
    await seedPurchaseWithSchedule(t, contactId, {
      dueDate: new Date(2026, 2, 5).getTime(),
      amount: 10000,
      month: 3,
      year: 2026,
    });

    const results = await t.query(api.billing.queries.listThisMonth, {
      orgId: ORG,
      now: MARCH_2026,
    });

    expect(results).toHaveLength(2);
    expect(results[0].dueDate).toBeLessThan(results[1].dueDate);
    expect(results[0].amount).toBe(10000);
    expect(results[1].amount).toBe(20000);
  });
});

describe("getCashFlowReport", () => {
  it("only buckets scheduled payments from the report year (BUG 6 regression)", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const contactId = await ctx.db.insert("contacts", {
        company: "Cashflow Corp",
        firstName: "Jack",
        lastName: "Flow",
        orgId: ORG,
        isDeleted: false,
        searchText: "Cashflow Corp Jack Flow",
      });
      const editionId = await ctx.db.insert("calendarEditions", {
        name: "Test Edition",
        code: "TE",
        orgId: ORG,
      });
      const purchaseId = await ctx.db.insert("purchases", {
        contactId,
        calendarEditionIds: [editionId],
        year: 2026,
        orgId: ORG,
        isDeleted: false,
      });
      // Scheduled payment in Dec 2026 (report year)
      await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2026, 11, 1).getTime(),
        amount: 50000,
        month: 12,
        year: 2026,
        orgId: ORG,
      });
      // Scheduled payment in Jan 2027 (next year — should NOT appear in 2026 report)
      await ctx.db.insert("scheduledPayments", {
        purchaseId,
        dueDate: new Date(2027, 0, 1).getTime(),
        amount: 50000,
        month: 1,
        year: 2027,
        orgId: ORG,
      });
      return { editionId };
    });

    const result = await t.query(api.billing.queries.getCashFlowReport, {
      orgId: ORG,
      calendarEditionId: ids.editionId,
      year: 2026,
    });

    expect(result.rows).toHaveLength(1);
    // December (index 11) should have 50000 projected
    expect(result.rows[0].months[11].projected).toBe(50000);
    // January (index 0) should be 0 since the Jan payment is 2027
    expect(result.rows[0].months[0].projected).toBe(0);
    // Year total should only include the 2026 payment
    expect(result.rows[0].yearTotal.projected).toBe(50000);
  });
});
