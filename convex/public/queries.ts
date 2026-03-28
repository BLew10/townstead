import { query, QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";

async function resolveOrg(ctx: QueryCtx, orgSlug: string): Promise<Doc<"tenantBranding"> | null> {
  return await ctx.db
    .query("tenantBranding")
    .withIndex("by_orgSlug", (q) => q.eq("orgSlug", orgSlug))
    .unique();
}

function filterByCommunity<T extends { communityIds?: Id<"communities">[] }>(
  items: T[],
  communityId?: Id<"communities">,
): T[] {
  if (!communityId) return items;
  return items.filter((item) => item.communityIds?.includes(communityId));
}

export const listCommunities = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const branding = await resolveOrg(ctx, args.orgSlug);
    if (!branding) return [];
    const orgId = branding.orgId;

    return await ctx.db
      .query("communities")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
  },
});

export const getHomepageData = query({
  args: {
    orgSlug: v.string(),
    communityId: v.optional(v.id("communities")),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const branding = await resolveOrg(ctx, args.orgSlug);
    if (!branding) return null;
    const orgId = branding.orgId;
    const now = args.now;

    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_orgId_and_date", (q) => q.eq("orgId", orgId).gte("date", now))
      .filter((q) =>
        q.and(
          q.neq(q.field("isDeleted"), true),
          q.neq(q.field("isApproved"), false)
        )
      )
      .take(20);

    const allContacts = await ctx.db
      .query("contacts")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) =>
        q.and(
          q.neq(q.field("isDeleted"), true),
          q.eq(q.field("featured"), true)
        )
      )
      .collect();

    const activeCoupons = await ctx.db
      .query("coupons")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) =>
        q.and(
          q.neq(q.field("isDeleted"), true),
          q.gte(q.field("endDate"), now)
        )
      )
      .take(20);

    const recentPosts = await ctx.db
      .query("blogPosts")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", orgId).eq("status", "published")
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .order("desc")
      .take(10);

    return {
      branding,
      featuredEvents: filterByCommunity(allEvents, args.communityId).slice(0, 5),
      featuredBusinesses: allContacts,
      activeCoupons: filterByCommunity(activeCoupons, args.communityId).slice(0, 6),
      recentPosts: filterByCommunity(recentPosts, args.communityId).slice(0, 3),
    };
  },
});

export const listEvents = query({
  args: {
    orgSlug: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    communityId: v.optional(v.id("communities")),
  },
  handler: async (ctx, args) => {
    const branding = await resolveOrg(ctx, args.orgSlug);
    if (!branding) return [];
    const orgId = branding.orgId;

    const buildIndex = () => {
      if (args.startDate !== undefined && args.endDate !== undefined) {
        return ctx.db
          .query("events")
          .withIndex("by_orgId_and_date", (q) =>
            q.eq("orgId", orgId).gte("date", args.startDate!).lte("date", args.endDate!)
          );
      }
      if (args.startDate !== undefined) {
        return ctx.db
          .query("events")
          .withIndex("by_orgId_and_date", (q) =>
            q.eq("orgId", orgId).gte("date", args.startDate!)
          );
      }
      if (args.endDate !== undefined) {
        return ctx.db
          .query("events")
          .withIndex("by_orgId_and_date", (q) =>
            q.eq("orgId", orgId).lte("date", args.endDate!)
          );
      }
      return ctx.db
        .query("events")
        .withIndex("by_orgId_and_date", (q) => q.eq("orgId", orgId));
    };

    let events = await buildIndex()
      .filter((filterQ) =>
        filterQ.and(
          filterQ.neq(filterQ.field("isDeleted"), true),
          filterQ.neq(filterQ.field("isApproved"), false)
        )
      )
      .collect();

    events = filterByCommunity(events, args.communityId);

    if (args.categoryId) {
      return events.filter((e) => e.categoryId === args.categoryId);
    }
    return events;
  },
});

export const getEvent = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event || event.isDeleted === true) return null;
    if (event.isApproved === false) return null;
    return event;
  },
});

export const listDirectoryBusinesses = query({
  args: {
    orgSlug: v.string(),
    categoryId: v.optional(v.id("categories")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const branding = await resolveOrg(ctx, args.orgSlug);
    if (!branding) return [];
    const orgId = branding.orgId;

    if (args.search) {
      const results = await ctx.db
        .query("contacts")
        .withSearchIndex("search_contacts", (q) =>
          q.search("searchText", args.search!).eq("orgId", orgId)
        )
        .filter((q) =>
          q.and(
            q.neq(q.field("isDeleted"), true),
            q.neq(q.field("company"), undefined)
          )
        )
        .collect();

      if (args.categoryId) {
        return results.filter((c) => c.categoryId === args.categoryId);
      }
      return results;
    }

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) =>
        q.and(
          q.neq(q.field("isDeleted"), true),
          q.neq(q.field("company"), undefined)
        )
      )
      .collect();

    if (args.categoryId) {
      return contacts.filter((c) => c.categoryId === args.categoryId);
    }
    return contacts;
  },
});

export const getDirectoryBusiness = query({
  args: { orgSlug: v.string(), slug: v.string() },
  handler: async (ctx, args) => {
    const branding = await resolveOrg(ctx, args.orgSlug);
    if (!branding) return null;
    const orgId = branding.orgId;

    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_orgId_and_slug", (q) =>
        q.eq("orgId", orgId).eq("slug", args.slug)
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .unique();

    return contact;
  },
});

export const listCoupons = query({
  args: {
    orgSlug: v.string(),
    communityId: v.optional(v.id("communities")),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const branding = await resolveOrg(ctx, args.orgSlug);
    if (!branding) return [];
    const orgId = branding.orgId;
    const now = args.now;

    const coupons = await ctx.db
      .query("coupons")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) =>
        q.and(
          q.neq(q.field("isDeleted"), true),
          q.gte(q.field("endDate"), now)
        )
      )
      .collect();

    return filterByCommunity(coupons, args.communityId);
  },
});

export const getCoupon = query({
  args: { id: v.id("coupons") },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.get(args.id);
    if (!coupon || coupon.isDeleted === true) return null;
    return coupon;
  },
});

export const listBlogPosts = query({
  args: {
    orgSlug: v.string(),
    categoryId: v.optional(v.id("categories")),
    communityId: v.optional(v.id("communities")),
  },
  handler: async (ctx, args) => {
    const branding = await resolveOrg(ctx, args.orgSlug);
    if (!branding) return [];
    const orgId = branding.orgId;

    let posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", orgId).eq("status", "published")
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .order("desc")
      .collect();

    posts = filterByCommunity(posts, args.communityId);

    if (args.categoryId) {
      return posts.filter((p) =>
        p.categoryIds?.includes(args.categoryId!)
      );
    }
    return posts;
  },
});

export const getBlogPost = query({
  args: { orgSlug: v.string(), slug: v.string() },
  handler: async (ctx, args) => {
    const branding = await resolveOrg(ctx, args.orgSlug);
    if (!branding) return null;
    const orgId = branding.orgId;

    const post = await ctx.db
      .query("blogPosts")
      .withIndex("by_orgId_and_slug", (q) =>
        q.eq("orgId", orgId).eq("slug", args.slug)
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("isDeleted"), true),
          q.eq(q.field("status"), "published")
        )
      )
      .unique();

    return post;
  },
});

export const listVideos = query({
  args: {
    orgSlug: v.string(),
    categoryId: v.optional(v.id("categories")),
    communityId: v.optional(v.id("communities")),
  },
  handler: async (ctx, args) => {
    const branding = await resolveOrg(ctx, args.orgSlug);
    if (!branding) return [];
    const orgId = branding.orgId;

    let videos = await ctx.db
      .query("videos")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    videos = filterByCommunity(videos, args.communityId);

    if (args.categoryId) {
      return videos.filter((v) => v.categoryId === args.categoryId);
    }
    return videos;
  },
});

export const getUserSubmissions = query({
  args: { orgSlug: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const branding = await resolveOrg(ctx, args.orgSlug);
    if (!branding) return [];
    const orgId = branding.orgId;
    const events = await ctx.db
      .query("events")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) =>
        q.and(
          q.neq(q.field("isDeleted"), true),
          q.eq(q.field("submittedBy"), args.userId)
        )
      )
      .collect();
    return events;
  },
});

export const getUserClaims = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const claims = await ctx.db
      .query("couponClaims")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const enriched = await Promise.all(
      claims.map(async (claim) => {
        const coupon = await ctx.db.get(claim.couponId);
        return { ...claim, coupon };
      })
    );
    return enriched;
  },
});

export const getSitemapData = query({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.db.query("tenantBranding").collect();

    const results = await Promise.all(
      tenants.map(async (tenant) => {
        const orgId = tenant.orgId;

        const events = await ctx.db
          .query("events")
          .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
          .filter((q) =>
            q.and(
              q.neq(q.field("isDeleted"), true),
              q.neq(q.field("isApproved"), false)
            )
          )
          .collect();

        const blogPosts = await ctx.db
          .query("blogPosts")
          .withIndex("by_orgId_and_status", (q) =>
            q.eq("orgId", orgId).eq("status", "published")
          )
          .filter((q) => q.neq(q.field("isDeleted"), true))
          .collect();

        const businesses = await ctx.db
          .query("contacts")
          .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
          .filter((q) =>
            q.and(
              q.neq(q.field("isDeleted"), true),
              q.neq(q.field("slug"), undefined)
            )
          )
          .collect();

        return {
          orgSlug: tenant.orgSlug,
          eventIds: events.map((e) => e._id),
          blogSlugs: blogPosts.map((p) => p.slug),
          businessSlugs: businesses
            .filter((b): b is typeof b & { slug: string } => !!b.slug)
            .map((b) => b.slug),
        };
      })
    );

    return results;
  },
});

export const listCategories = query({
  args: {
    orgSlug: v.string(),
    type: v.optional(
      v.union(
        v.literal("event"),
        v.literal("blog"),
        v.literal("video"),
        v.literal("business")
      )
    ),
  },
  handler: async (ctx, args) => {
    const branding = await resolveOrg(ctx, args.orgSlug);
    if (!branding) return [];
    const orgId = branding.orgId;

    if (args.type) {
      return await ctx.db
        .query("categories")
        .withIndex("by_orgId_and_type", (q) =>
          q.eq("orgId", orgId).eq("type", args.type!)
        )
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();
    }

    return await ctx.db
      .query("categories")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
  },
});
