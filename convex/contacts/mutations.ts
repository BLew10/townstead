import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Send this advertiser to ourcornercalendar.com.
 *
 * Scheduled rather than awaited: a mutation cannot make a network request, and
 * Joyce should be able to save a customer whether or not the website happens to
 * be reachable. `runAfter(0, …)` runs once this mutation has committed, so the
 * website is never told about a change that then rolled back.
 */
function syncToWebsite(ctx: MutationCtx, contactId: Id<"contacts">) {
  // A deployment with no website configured — a preview, a local dev copy, the
  // test suite — has nothing to sync to, and queueing the work anyway would
  // mean a backlog of jobs that exist only to fail.
  if (!process.env.WEBSITE_SUPABASE_URL) return Promise.resolve();

  return ctx.scheduler.runAfter(0, internal.websiteSync.actions.pushContact, {
    contactId,
  });
}

const addressValidator = v.optional(
  v.object({
    street: v.optional(v.string()),
    street2: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    country: v.optional(v.string()),
  })
);

const contactFields = {
  company: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  salutation: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  cellPhone: v.optional(v.string()),
  fax: v.optional(v.string()),
  altPhone: v.optional(v.string()),
  altContactFirstName: v.optional(v.string()),
  altContactLastName: v.optional(v.string()),
  address: addressValidator,
  website: v.optional(v.string()),
  categoryId: v.optional(v.id("categories")),
  logoFileId: v.optional(v.id("_storage")),
  notes: v.optional(v.string()),
  customerSince: v.optional(v.number()),
  addressBookIds: v.optional(v.array(v.id("addressBooks"))),
};

function buildSearchText(fields: {
  company: string;
  firstName: string;
  lastName: string;
  email?: string;
}): string {
  return [fields.company, fields.firstName, fields.lastName, fields.email]
    .filter(Boolean)
    .join(" ");
}

export const create = mutation({
  args: {
    orgId: v.string(),
    ...contactFields,
  },
  handler: async (ctx, args) => {
    if (args.email) {
      const existing = await ctx.db
        .query("contacts")
        .withIndex("by_orgId_and_email", (q) =>
          q.eq("orgId", args.orgId).eq("email", args.email)
        )
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .first();
      if (existing) {
        throw new Error(
          `A contact with the email "${args.email}" already exists.`
        );
      }
    }

    const searchText = buildSearchText(args);
    const id = await ctx.db.insert("contacts", {
      ...args,
      searchText,
      isDeleted: false,
      updatedAt: Date.now(),
    });
    await syncToWebsite(ctx, id);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    ...contactFields,
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Contact not found");

    if (fields.email) {
      const existing = await ctx.db
        .query("contacts")
        .withIndex("by_orgId_and_email", (q) =>
          q.eq("orgId", doc.orgId).eq("email", fields.email)
        )
        .filter((q) =>
          q.and(
            q.neq(q.field("isDeleted"), true),
            q.neq(q.field("_id"), id)
          )
        )
        .first();
      if (existing) {
        throw new Error(
          `A contact with the email "${fields.email}" already exists.`
        );
      }
    }

    const searchText = buildSearchText(fields);
    await ctx.db.patch(id, {
      ...fields,
      searchText,
      updatedAt: Date.now(),
    });
    await syncToWebsite(ctx, id);
  },
});

export const softDelete = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      email: undefined,
      isDeleted: true,
    });
    // The website's copy is hidden, not deleted. It may carry photos, hours
    // and a description written on that side, and none of that is this sync's
    // to throw away.
    await syncToWebsite(ctx, args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
