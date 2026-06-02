import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

/**
 * Returns the number of events that still carry the legacy `communityIds`
 * field and need backfilling. Drives the auto-migration trigger in the UI:
 * if > 0, the client fires `migrateCommunityIdsToEditions` once.
 */
export const pendingCommunityIdMigration = query({
  args: {},
  handler: async (ctx) => {
    let pending = 0;
    for await (const event of ctx.db.query("events")) {
      if ((event.communityIds?.length ?? 0) > 0) pending++;
    }
    return pending;
  },
});

/**
 * One-shot migration across ALL orgs: for every event with `communityIds`,
 * derive `calendarEditionIds` from each linked community's `calendarEditionIds`
 * (union, deduped), then clear `communityIds`. Idempotent — re-running is safe
 * and does nothing once all events are clean. Each event keeps its own orgId.
 *
 * Auto-fires from the admin shell on app load (see useAutoMigrations). Can
 * also be triggered manually:
 *   npx convex run events/migration:migrateCommunityIdsToEditions
 */
export const migrateCommunityIdsToEditions = mutation({
  args: {},
  handler: async (ctx) => {
    const communityCache = new Map<
      Id<"communities">,
      Doc<"communities"> | null
    >();

    let migrated = 0;
    let cleared = 0;
    let skipped = 0;
    let totalEvents = 0;

    for await (const event of ctx.db.query("events")) {
      totalEvents++;
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
      totalEvents,
      migrated,
      clearedWithoutMatch: cleared,
      skippedAlreadyClean: skipped,
    };
  },
});
