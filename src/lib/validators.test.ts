import { describe, it, expect } from "vitest";
import {
  calendarEditionSchema,
  advertisementSchema,
  monthlyPricesSchema,
  adPricingSchema,
  contactSchema,
  purchaseSchema,
  paymentTermsSchema,
  paymentSchema,
  eventSchema,
  addressBookSchema,
  categorySchema,
} from "./validators";

// ---------------------------------------------------------------------------
// calendarEditionSchema
// ---------------------------------------------------------------------------

describe("calendarEditionSchema", () => {
  it("accepts valid data", () => {
    const result = calendarEditionSchema.parse({
      name: "Spring 2026",
      code: "SP26",
    });
    expect(result.name).toBe("Spring 2026");
    expect(result.code).toBe("SP26");
  });

  it("rejects empty name", () => {
    expect(() =>
      calendarEditionSchema.parse({ name: "", code: "SP26" })
    ).toThrow();
  });

  it("rejects missing code", () => {
    expect(() => calendarEditionSchema.parse({ name: "Spring" })).toThrow();
  });

  it("rejects empty code", () => {
    expect(() =>
      calendarEditionSchema.parse({ name: "Spring", code: "" })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// advertisementSchema
// ---------------------------------------------------------------------------

describe("advertisementSchema", () => {
  it("accepts valid data", () => {
    const result = advertisementSchema.parse({
      name: "Full Page",
      isDayType: false,
      slotsPerMonth: 4,
    });
    expect(result.slotsPerMonth).toBe(4);
  });

  it("accepts zero slotsPerMonth", () => {
    expect(() =>
      advertisementSchema.parse({
        name: "Ad",
        isDayType: true,
        slotsPerMonth: 0,
      })
    ).not.toThrow();
  });

  it("rejects negative slotsPerMonth", () => {
    expect(() =>
      advertisementSchema.parse({
        name: "Ad",
        isDayType: true,
        slotsPerMonth: -1,
      })
    ).toThrow();
  });

  it("rejects non-integer slotsPerMonth", () => {
    expect(() =>
      advertisementSchema.parse({
        name: "Ad",
        isDayType: true,
        slotsPerMonth: 1.5,
      })
    ).toThrow();
  });

  it("rejects missing isDayType", () => {
    expect(() =>
      advertisementSchema.parse({ name: "Ad", slotsPerMonth: 1 })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// monthlyPricesSchema
// ---------------------------------------------------------------------------

describe("monthlyPricesSchema", () => {
  const validPrices = {
    jan: 100,
    feb: 100,
    mar: 100,
    apr: 100,
    may: 100,
    jun: 100,
    jul: 100,
    aug: 100,
    sep: 100,
    oct: 100,
    nov: 100,
    dec: 100,
  };

  it("accepts all valid monthly prices", () => {
    expect(() => monthlyPricesSchema.parse(validPrices)).not.toThrow();
  });

  it("accepts zero prices", () => {
    const zeroPrices = Object.fromEntries(
      Object.keys(validPrices).map((k) => [k, 0])
    );
    expect(() => monthlyPricesSchema.parse(zeroPrices)).not.toThrow();
  });

  it("rejects negative prices", () => {
    expect(() =>
      monthlyPricesSchema.parse({ ...validPrices, jan: -1 })
    ).toThrow();
  });

  it("rejects missing months", () => {
    const { dec: _, ...incomplete } = validPrices;
    expect(() => monthlyPricesSchema.parse(incomplete)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// adPricingSchema
// ---------------------------------------------------------------------------

describe("adPricingSchema", () => {
  const validPricing = {
    advertisementId: "ad_123",
    calendarEditionId: "ce_456",
    year: 2026,
    monthlyPrices: {
      jan: 100,
      feb: 100,
      mar: 100,
      apr: 100,
      may: 100,
      jun: 100,
      jul: 100,
      aug: 100,
      sep: 100,
      oct: 100,
      nov: 100,
      dec: 100,
    },
  };

  it("accepts valid data", () => {
    expect(() => adPricingSchema.parse(validPricing)).not.toThrow();
  });

  it("rejects year below 2000", () => {
    expect(() =>
      adPricingSchema.parse({ ...validPricing, year: 1999 })
    ).toThrow();
  });

  it("rejects year above 2100", () => {
    expect(() =>
      adPricingSchema.parse({ ...validPricing, year: 2101 })
    ).toThrow();
  });

  it("rejects empty advertisementId", () => {
    expect(() =>
      adPricingSchema.parse({ ...validPricing, advertisementId: "" })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// contactSchema
// ---------------------------------------------------------------------------

describe("contactSchema", () => {
  const validContact = {
    company: "Acme",
    firstName: "Jane",
    lastName: "Doe",
  };

  it("accepts valid contact with required fields only", () => {
    expect(() => contactSchema.parse(validContact)).not.toThrow();
  });

  it("rejects empty firstName", () => {
    expect(() =>
      contactSchema.parse({ ...validContact, firstName: "" })
    ).toThrow();
  });

  it("rejects empty lastName", () => {
    expect(() =>
      contactSchema.parse({ ...validContact, lastName: "" })
    ).toThrow();
  });

  it("accepts valid email", () => {
    expect(() =>
      contactSchema.parse({ ...validContact, email: "jane@example.com" })
    ).not.toThrow();
  });

  it("rejects invalid email", () => {
    expect(() =>
      contactSchema.parse({ ...validContact, email: "not-an-email" })
    ).toThrow();
  });

  it("accepts empty string email (opt-out)", () => {
    expect(() =>
      contactSchema.parse({ ...validContact, email: "" })
    ).not.toThrow();
  });

  it("accepts valid website URL", () => {
    expect(() =>
      contactSchema.parse({
        ...validContact,
        website: "https://example.com",
      })
    ).not.toThrow();
  });

  it("rejects invalid website URL", () => {
    expect(() =>
      contactSchema.parse({ ...validContact, website: "not-a-url" })
    ).toThrow();
  });

  it("accepts empty string website (opt-out)", () => {
    expect(() =>
      contactSchema.parse({ ...validContact, website: "" })
    ).not.toThrow();
  });

  it("allows omitting all optional fields", () => {
    const result = contactSchema.parse(validContact);
    expect(result.email).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.address).toBeUndefined();
  });

  it("accepts nested address", () => {
    expect(() =>
      contactSchema.parse({
        ...validContact,
        address: { street: "123 Main St", city: "Springfield", state: "IL" },
      })
    ).not.toThrow();
  });

  it("accepts addressBookIds array", () => {
    const result = contactSchema.parse({
      ...validContact,
      addressBookIds: ["ab1", "ab2"],
    });
    expect(result.addressBookIds).toEqual(["ab1", "ab2"]);
  });
});

// ---------------------------------------------------------------------------
// purchaseSchema
// ---------------------------------------------------------------------------

describe("purchaseSchema", () => {
  it("accepts valid purchase", () => {
    expect(() =>
      purchaseSchema.parse({
        contactId: "c1",
        calendarEditionIds: ["e1"],
        year: 2026,
      })
    ).not.toThrow();
  });

  it("requires at least one calendar edition", () => {
    expect(() =>
      purchaseSchema.parse({
        contactId: "c1",
        calendarEditionIds: [],
        year: 2026,
      })
    ).toThrow();
  });

  it("rejects empty contactId", () => {
    expect(() =>
      purchaseSchema.parse({
        contactId: "",
        calendarEditionIds: ["e1"],
        year: 2026,
      })
    ).toThrow();
  });

  it("validates year range lower bound", () => {
    expect(() =>
      purchaseSchema.parse({
        contactId: "c1",
        calendarEditionIds: ["e1"],
        year: 1999,
      })
    ).toThrow();
  });

  it("validates year range upper bound", () => {
    expect(() =>
      purchaseSchema.parse({
        contactId: "c1",
        calendarEditionIds: ["e1"],
        year: 2101,
      })
    ).toThrow();
  });

  it("accepts multiple calendar editions", () => {
    const result = purchaseSchema.parse({
      contactId: "c1",
      calendarEditionIds: ["e1", "e2", "e3"],
      year: 2026,
    });
    expect(result.calendarEditionIds).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// paymentTermsSchema
// ---------------------------------------------------------------------------

describe("paymentTermsSchema", () => {
  it("accepts minimal valid terms", () => {
    expect(() => paymentTermsSchema.parse({ totalSale: 100 })).not.toThrow();
  });

  it("rejects negative totalSale", () => {
    expect(() => paymentTermsSchema.parse({ totalSale: -1 })).toThrow();
  });

  it("accepts zero totalSale", () => {
    expect(() => paymentTermsSchema.parse({ totalSale: 0 })).not.toThrow();
  });

  it("accepts valid late fee configuration", () => {
    expect(() =>
      paymentTermsSchema.parse({
        totalSale: 1000,
        lateFeeType: "flat",
        lateFeeAmount: 25,
      })
    ).not.toThrow();
  });

  it("accepts percent late fee type", () => {
    expect(() =>
      paymentTermsSchema.parse({
        totalSale: 1000,
        lateFeeType: "percent",
        lateFeeAmount: 5,
      })
    ).not.toThrow();
  });

  it("rejects invalid lateFeeType", () => {
    expect(() =>
      paymentTermsSchema.parse({
        totalSale: 1000,
        lateFeeType: "invalid",
      })
    ).toThrow();
  });

  it("validates dueDayOfMonth minimum (1)", () => {
    expect(() =>
      paymentTermsSchema.parse({ totalSale: 100, dueDayOfMonth: 0 })
    ).toThrow();
  });

  it("validates dueDayOfMonth maximum (31)", () => {
    expect(() =>
      paymentTermsSchema.parse({ totalSale: 100, dueDayOfMonth: 32 })
    ).toThrow();
  });

  it("accepts valid dueDayOfMonth", () => {
    expect(() =>
      paymentTermsSchema.parse({ totalSale: 100, dueDayOfMonth: 15 })
    ).not.toThrow();
  });

  it("validates schedule range months are 1-12", () => {
    expect(() =>
      paymentTermsSchema.parse({ totalSale: 100, scheduleStartMonth: 0 })
    ).toThrow();
    expect(() =>
      paymentTermsSchema.parse({ totalSale: 100, scheduleEndMonth: 13 })
    ).toThrow();
  });

  it("accepts valid schedule range", () => {
    expect(() =>
      paymentTermsSchema.parse({
        totalSale: 100,
        scheduleStartMonth: 1,
        scheduleStartYear: 2026,
        scheduleEndMonth: 12,
        scheduleEndYear: 2026,
      })
    ).not.toThrow();
  });

  it("accepts customSchedule entries", () => {
    expect(() =>
      paymentTermsSchema.parse({
        totalSale: 100,
        splitEqually: false,
        customSchedule: [
          { month: 1, year: 2026, amount: 50 },
          { month: 6, year: 2026, amount: 50 },
        ],
      })
    ).not.toThrow();
  });

  it("accepts early discount configuration", () => {
    expect(() =>
      paymentTermsSchema.parse({
        totalSale: 1000,
        earlyDiscountType: "percent",
        earlyDiscountAmount: 10,
      })
    ).not.toThrow();
  });

  it("rejects negative discount amounts", () => {
    expect(() =>
      paymentTermsSchema.parse({ totalSale: 100, discount1: -5 })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// paymentSchema
// ---------------------------------------------------------------------------

describe("paymentSchema", () => {
  it("accepts valid payment", () => {
    expect(() =>
      paymentSchema.parse({
        purchaseId: "p1",
        amount: 100,
        date: Date.now(),
      })
    ).not.toThrow();
  });

  it("requires amount greater than 0", () => {
    expect(() =>
      paymentSchema.parse({ purchaseId: "p1", amount: 0, date: Date.now() })
    ).toThrow();
  });

  it("accepts small positive amount", () => {
    expect(() =>
      paymentSchema.parse({
        purchaseId: "p1",
        amount: 0.01,
        date: Date.now(),
      })
    ).not.toThrow();
  });

  it("rejects empty purchaseId", () => {
    expect(() =>
      paymentSchema.parse({ purchaseId: "", amount: 100, date: Date.now() })
    ).toThrow();
  });

  it("allows optional fields to be omitted", () => {
    const result = paymentSchema.parse({
      purchaseId: "p1",
      amount: 100,
      date: 1700000000000,
    });
    expect(result.method).toBeUndefined();
    expect(result.checkNumber).toBeUndefined();
    expect(result.isPrepaid).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// eventSchema
// ---------------------------------------------------------------------------

describe("eventSchema", () => {
  it("accepts valid event with required fields", () => {
    expect(() =>
      eventSchema.parse({
        name: "Town Fair",
        date: 1700000000000,
        startsOn: 1700000000000,
      })
    ).not.toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      eventSchema.parse({
        name: "",
        date: 1700000000000,
        startsOn: 1700000000000,
      })
    ).toThrow();
  });

  it("rejects missing startsOn (date is required)", () => {
    expect(() =>
      eventSchema.parse({ name: "Town Fair", date: 1700000000000 })
    ).toThrow(/required/i);
  });

  it("rejects endsOn earlier than startsOn for repeating events", () => {
    expect(() =>
      eventSchema.parse({
        name: "Range",
        date: 1700000000000,
        startsOn: 1700200000000,
        endsOn: 1700100000000,
        scheduleType: "DAILY_RANGE",
      })
    ).toThrow(/after/i);
  });

  it("accepts all optional fields", () => {
    const result = eventSchema.parse({
      name: "Town Fair",
      date: 1700000000000,
      startsOn: 1700000000000,
      endDate: 1700100000000,
      description: "Annual event",
      startTime: "10:00",
      endTime: "18:00",
      isYearly: true,
      calendarEditionIds: ["ed1", "ed2"],
    });
    expect(result.isYearly).toBe(true);
    expect(result.calendarEditionIds).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// addressBookSchema
// ---------------------------------------------------------------------------

describe("addressBookSchema", () => {
  it("accepts valid address book", () => {
    expect(() =>
      addressBookSchema.parse({ name: "VIP Clients" })
    ).not.toThrow();
  });

  it("rejects empty name", () => {
    expect(() => addressBookSchema.parse({ name: "" })).toThrow();
  });

  it("allows optional displayLevel", () => {
    const result = addressBookSchema.parse({
      name: "Standard",
      displayLevel: "gold",
    });
    expect(result.displayLevel).toBe("gold");
  });
});

// ---------------------------------------------------------------------------
// categorySchema
// ---------------------------------------------------------------------------

describe("categorySchema", () => {
  it("accepts valid category with each type", () => {
    for (const type of ["event", "blog", "video", "business"] as const) {
      expect(() =>
        categorySchema.parse({ name: "Test", type })
      ).not.toThrow();
    }
  });

  it("rejects invalid type", () => {
    expect(() =>
      categorySchema.parse({ name: "Test", type: "invalid" })
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      categorySchema.parse({ name: "", type: "event" })
    ).toThrow();
  });

  it("rejects missing type", () => {
    expect(() => categorySchema.parse({ name: "Test" })).toThrow();
  });
});

