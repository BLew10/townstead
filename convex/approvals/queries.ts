import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../auth.helpers";

export const listPending = query({
  args: {
    type: v.optional(
      v.union(v.literal("events"), v.literal("blog"), v.literal("videos"))
    ),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const includeEvents = !args.type || args.type === "events";
    const includeBlog = !args.type || args.type === "blog";
    const includeVideos = !args.type || args.type === "videos";

    const pendingEvents = includeEvents
      ? await ctx.db
          .query("events")
          .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
          .filter((q) =>
            q.and(
              q.neq(q.field("isDeleted"), true),
              q.eq(q.field("isApproved"), false)
            )
          )
          .collect()
      : [];

    const pendingBlog = includeBlog
      ? await ctx.db
          .query("blogPosts")
          .withIndex("by_orgId_and_status", (q) =>
            q.eq("orgId", orgId).eq("status", "pending")
          )
          .filter((q) => q.neq(q.field("isDeleted"), true))
          .collect()
      : [];

    const pendingVideos = includeVideos
      ? await ctx.db
          .query("videos")
          .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
          .filter((q) =>
            q.and(
              q.neq(q.field("isDeleted"), true),
              q.eq(q.field("isApproved"), false)
            )
          )
          .collect()
      : [];

    return { events: pendingEvents, blogPosts: pendingBlog, videos: pendingVideos };
  },
});

export const countPending = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireAuth(ctx);

    const pendingEvents = await ctx.db
      .query("events")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) =>
        q.and(
          q.neq(q.field("isDeleted"), true),
          q.eq(q.field("isApproved"), false)
        )
      )
      .collect();

    const pendingBlog = await ctx.db
      .query("blogPosts")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", orgId).eq("status", "pending")
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const pendingVideos = await ctx.db
      .query("videos")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) =>
        q.and(
          q.neq(q.field("isDeleted"), true),
          q.eq(q.field("isApproved"), false)
        )
      )
      .collect();

    return {
      events: pendingEvents.length,
      blog: pendingBlog.length,
      videos: pendingVideos.length,
      total: pendingEvents.length + pendingBlog.length + pendingVideos.length,
    };
  },
});
