import { mutation } from "../_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";

/**
 * One-shot migration: for every event with `communityIds`, derive
 * `calendarEditionIds` from each linked community's `calendarEditionIds`
 * (union, deduped), then clear `communityIds`.
 *
 * Run from the Convex dashboard or via `npx convex run events/migration:migrateCommunityIdsToEditions '{"orgId":"<your-org>"}'`.
 *
 * Safe to re-run: events without `communityIds` are skipped.
 */
export const migrateCommunityIdsToEditions = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    const communityCache = new Map<Id<"communities">, Doc<"communities"> | null>();

    let migrated = 0;
    let cleared = 0;
    let skipped = 0;

    for (const event of events) {
      const legacyIds = event.communityIds;
      if (!legacyIds || legacyIds.length === 0) {
        skipped++;
        continue;
      }

      const editionIdSet = new Set<Id<"calendarEditions">>(
        event.calendarEditionIds ?? []
      );

      for (const communityId of legacyIds) {
        let community = communityCache.get(communityId);
        if (community === undefined) {
          community = await ctx.db.get(communityId);
          communityCache.set(communityId, community);
        }
        if (!community) continue;
        for (const editionId of community.calendarEditionIds ?? []) {
          editionIdSet.add(editionId);
        }
      }

      const finalEditionIds = Array.from(editionIdSet);

      await ctx.db.patch(event._id, {
        calendarEditionIds:
          finalEditionIds.length > 0 ? finalEditionIds : undefined,
        communityIds: undefined,
      });

      if (finalEditionIds.length > 0) migrated++;
      else cleared++;
    }

    return {
      totalEvents: events.length,
      migrated,
      clearedWithoutMatch: cleared,
      skippedAlreadyClean: skipped,
    };
  },
});
