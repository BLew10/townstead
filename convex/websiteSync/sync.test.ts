import { describe, it, expect } from "vitest";
import {
  contactToProfile,
  updatePayload,
  hidePayload,
  normaliseWebsite,
  formatStreet,
  formatPerson,
  type SyncContact,
} from "./map";
import { chooseProfile } from "./match";
import { readConfig } from "./website";

const contact = (over: Partial<SyncContact> = {}): SyncContact => ({
  _id: "k1",
  company: "Pinot's Palette",
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@pinots.example",
  phone: "916-555-0100",
  address: { street: "123 Main St", city: "West Sacramento", state: "CA", zip: "95691" },
  ...over,
});

const at = () => new Date("2026-09-03T12:00:00.000Z");

describe("what gets written to the website", () => {
  it("maps an advertiser onto a business profile", () => {
    const p = contactToProfile(contact(), { categoryName: "Arts", now: at });
    expect(p.name).toBe("Pinot's Palette");
    expect(p.contact_name).toBe("Jane Smith");
    expect(p.contact_email).toBe("jane@pinots.example");
    expect(p.phone).toBe("916-555-0100");
    expect(p.address).toBe("123 Main St");
    expect(p.city).toBe("West Sacramento");
    expect(p.zip).toBe("95691");
    expect(p.category).toBe("Arts");
    expect(p.townstead_contact_id).toBe("k1");
  });

  it("falls back to the mobile number when there is no main one", () => {
    const p = contactToProfile(contact({ phone: undefined, cellPhone: "916-555-0199" }), { now: at });
    expect(p.phone).toBe("916-555-0199");
  });

  it("keeps the street lines together and the city apart", () => {
    expect(formatStreet({ street: "123 Main St", street2: "Suite 2", city: "Davis" }))
      .toBe("123 Main St, Suite 2");
    expect(formatStreet(undefined)).toBe("");
  });

  it("does not invent a name from nothing", () => {
    expect(formatPerson(contact({ firstName: "", lastName: "" }))).toBe("");
    expect(formatPerson(contact({ firstName: "Jane", lastName: "" }))).toBe("Jane");
  });

  it("trims whitespace so a stray space is not saved as a value", () => {
    const p = contactToProfile(contact({ company: "  Bob's Diner  ", email: " bob@x.example " }), { now: at });
    expect(p.name).toBe("Bob's Diner");
    expect(p.contact_email).toBe("bob@x.example");
  });
});

describe("website addresses", () => {
  it("adds a scheme so the link actually leaves the site", () => {
    // Saved bare, this resolves against ourcornercalendar.com and 404s.
    expect(normaliseWebsite("example.com")).toBe("https://example.com");
  });

  it("leaves a full address alone", () => {
    expect(normaliseWebsite("http://example.com/a")).toBe("http://example.com/a");
    expect(normaliseWebsite("https://example.com")).toBe("https://example.com");
  });

  it("refuses a scheme that is not the web", () => {
    expect(normaliseWebsite("javascript:alert(1)")).toBe("");
    expect(normaliseWebsite("mailto:jane@example.com")).toBe("");
  });

  it("treats nothing as nothing", () => {
    expect(normaliseWebsite(undefined)).toBe("");
    expect(normaliseWebsite("   ")).toBe("");
  });
});

describe("updating a business that already exists", () => {
  it("does not erase a field the website has and the ad sales site does not", () => {
    const p = contactToProfile(contact({ phone: undefined, cellPhone: undefined, website: undefined }), { now: at });
    const body = updatePayload(p);
    expect(body).not.toHaveProperty("phone");
    expect(body).not.toHaveProperty("website");
    expect(body.name).toBe("Pinot's Palette");
  });

  it("leaves category and description to the website", () => {
    const p = contactToProfile(contact(), { categoryName: "Arts", now: at });
    const body = updatePayload(p);
    expect(body).not.toHaveProperty("category");
    expect(body).not.toHaveProperty("description");
  });

  it("does not change whether a business is published, ever, on an update", () => {
    // Joyce publishes and hides on the website. Correcting a phone number on
    // the ad sales site is not her asking for either.
    const p = contactToProfile(contact(), { now: at });
    expect(updatePayload(p)).not.toHaveProperty("hidden");
  });

  it("still sends them when the business is first created", () => {
    const p = contactToProfile(contact(), { categoryName: "Arts", now: at });
    expect(p.category).toBe("Arts");
  });

  it("adds the logo to a business that has no photos yet", () => {
    // Most advertisers reach the website by being matched, not created -- every
    // one carried over from the old system did. Without this they would never
    // get a logo at all.
    const p = contactToProfile(contact(), { logoUrl: "https://files/logo.png", now: at });
    expect(updatePayload(p, { photos: [] }).photos)
      .toEqual([{ url: "https://files/logo.png", caption: "" }]);
    expect(updatePayload(p, {}).photos)
      .toEqual([{ url: "https://files/logo.png", caption: "" }]);
    expect(updatePayload(p, { photos: null }).photos)
      .toEqual([{ url: "https://files/logo.png", caption: "" }]);
  });

  it("never displaces a photo somebody chose", () => {
    const p = contactToProfile(contact(), { logoUrl: "https://files/logo.png", now: at });
    expect(updatePayload(p, { photos: [{ url: "https://site/storefront.jpg" }] }))
      .not.toHaveProperty("photos");
  });

  it("ignores photo entries with no image behind them", () => {
    // A row holding [{caption: "..."}] with no url shows nothing, so it counts
    // as an empty gallery rather than as a photo worth protecting.
    const p = contactToProfile(contact(), { logoUrl: "https://files/logo.png", now: at });
    expect(updatePayload(p, { photos: [{}] }).photos)
      .toEqual([{ url: "https://files/logo.png", caption: "" }]);
  });

  it("sends no photos when there is no logo to send", () => {
    const p = contactToProfile(contact(), { now: at });
    expect(updatePayload(p, { photos: [] })).not.toHaveProperty("photos");
  });

  it("hides rather than empties when the advertiser was deleted here", () => {
    // softDelete clears the contact's email. Passing that emptiness on would
    // unlink the business from its owner's login on the website.
    const p = contactToProfile(contact({ isDeleted: true, email: undefined }), { now: at });
    const body = hidePayload(p);
    expect(body).toEqual({ hidden: true, updated_at: "2026-09-03T12:00:00.000Z" });
    expect(body).not.toHaveProperty("contact_email");
  });
});

describe("a new business arrives hidden", () => {
  it("is created hidden, whatever else is true of it", () => {
    // 815 imported advertisers once appeared in the public directory at once.
    // A profile carrying a name and a phone number is not something Joyce
    // wrote, and publishing is her decision, made in her admin.
    expect(contactToProfile(contact(), { now: at }).hidden).toBe(true);
    expect(contactToProfile(contact({ description: "A paint studio" }), { now: at }).hidden).toBe(true);
    expect(contactToProfile(contact(), { categoryName: "Arts", logoUrl: "https://x/l.png", now: at }).hidden).toBe(true);
  });

  it("carries the logo in as the first photo, so a published page is not bare", () => {
    const p = contactToProfile(contact(), { logoUrl: "https://files/logo.png", now: at });
    expect(p.photos).toEqual([{ url: "https://files/logo.png", caption: "" }]);
  });

  it("sends no photos key at all when there is no logo", () => {
    // Not an empty array: that would overwrite nothing today but reads as "this
    // business has no photos", which is a claim the ad sales site cannot make.
    expect(contactToProfile(contact(), { now: at })).not.toHaveProperty("photos");
    expect(contactToProfile(contact(), { logoUrl: "   ", now: at })).not.toHaveProperty("photos");
  });
});

describe("deciding whether the business is already there", () => {
  const row = (id: string, over: Record<string, unknown> = {}) => ({
    id, name: "Pinot's Palette", contact_email: "jane@pinots.example", ...over,
  });

  it("follows the link before anything else", () => {
    const d = chooseProfile("k1", {
      byContactId: [row("b1")],
      byEmail: [row("b2")],
      byName: [row("b3")],
    });
    expect(d).toEqual({ action: "update", id: "b1", how: "link" });
  });

  it("adopts a business with the same email", () => {
    const d = chooseProfile("k1", { byContactId: [], byEmail: [row("b2")], byName: [] });
    expect(d).toEqual({ action: "update", id: "b2", how: "email" });
  });

  it("adopts a business with the same name when only one has it", () => {
    const d = chooseProfile("k1", { byContactId: [], byEmail: [], byName: [row("b3")] });
    expect(d).toEqual({ action: "update", id: "b3", how: "name" });
  });

  it("never merges four State Farm agents onto one business", () => {
    // The mistake this rule exists to prevent: several franchise siblings share
    // a company name, and matching on it alone sends every invoice to one of
    // them.
    const d = chooseProfile("k1", {
      byContactId: [],
      byEmail: [],
      byName: [row("b1"), row("b2"), row("b3"), row("b4")],
    });
    expect(d.action).toBe("create");
  });

  it("does not take over a business that belongs to another advertiser", () => {
    const d = chooseProfile("k1", {
      byContactId: [],
      byEmail: [row("b2", { townstead_contact_id: "k9" })],
      byName: [],
    });
    expect(d.action).toBe("create");
  });

  it("re-adopts a row already carrying this advertiser's link", () => {
    const d = chooseProfile("k1", {
      byContactId: [],
      byEmail: [row("b2", { townstead_contact_id: "k1" })],
      byName: [],
    });
    expect(d).toEqual({ action: "update", id: "b2", how: "email" });
  });

  it("creates one when the website has never heard of it", () => {
    expect(chooseProfile("k1", { byContactId: [], byEmail: [], byName: [] }))
      .toEqual({ action: "create", how: "new" });
  });
});

describe("configuration", () => {
  it("refuses to sync when the website is not configured", () => {
    expect(readConfig({})).toBeNull();
    expect(readConfig({ WEBSITE_SUPABASE_URL: "https://x.supabase.co" })).toBeNull();
    expect(readConfig({ WEBSITE_SUPABASE_SERVICE_KEY: "k" })).toBeNull();
  });

  it("drops a trailing slash so the request path is not doubled", () => {
    const c = readConfig({
      WEBSITE_SUPABASE_URL: "https://x.supabase.co/",
      WEBSITE_SUPABASE_SERVICE_KEY: "k",
    });
    expect(c).toEqual({ url: "https://x.supabase.co", serviceKey: "k" });
  });
});
