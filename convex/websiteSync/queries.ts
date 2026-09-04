import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Everything the sync action needs about one contact, read in a query so the
 * action itself never touches the database directly.
 */
export const gatherContact = internalQuery({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) return null;

    let categoryName: string | undefined;
    if (contact.categoryId) {
      const category = await ctx.db.get(contact.categoryId);
      categoryName = category?.name;
    }

    // The logo, as an address the website can load. Convex serves stored files
    // over plain HTTPS, so the website links to it rather than holding a copy
    // -- which also means replacing the logo here replaces it there.
    //
    // getUrl returns null for a file that has been deleted, and a missing logo
    // is not a reason to refuse to sync a business, so it stays optional.
    let logoUrl: string | undefined;
    if (contact.logoFileId) {
      logoUrl = (await ctx.storage.getUrl(contact.logoFileId)) ?? undefined;
    }

    return { contact, categoryName, logoUrl };
  },
});

/** One page of contacts, for the backfill. */
export const listContactsPage = internalQuery({
  args: { orgId: v.string(), cursor: v.union(v.string(), v.null()), pageSize: v.number() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("contacts")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .paginate({ cursor: args.cursor, numItems: args.pageSize });
    return {
      ids: page.page.map((c) => c._id),
      cursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

/**
 * What happened on the last attempt to push each contact to the website.
 *
 * A sync that fails silently is worse than no sync at all, because Joyce would
 * have no reason to doubt the website. Every attempt lands here, and the ad
 * sales site can show her which advertisers did not make it across.
 */
export const recordResult = internalMutation({
  args: {
    contactId: v.id("contacts"),
    ok: v.boolean(),
    detail: v.string(),
    websiteBusinessId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("websiteSyncLog")
      .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId))
      .first();

    const row = {
      contactId: args.contactId,
      ok: args.ok,
      detail: args.detail,
      websiteBusinessId: args.websiteBusinessId,
      at: Date.now(),
    };

    if (existing) await ctx.db.patch(existing._id, row);
    else await ctx.db.insert("websiteSyncLog", row);
  },
});

/** The advertisers that did not reach the website, for Joyce to look at. */
export const listFailures = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("websiteSyncLog")
      .withIndex("by_ok", (q) => q.eq("ok", false))
      .collect();
  },
});
