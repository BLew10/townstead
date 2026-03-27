import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import * as idMap from "./id-map";
import { log, toTimestamp, type MigrationStep } from "./utils";

const STEP = "06-events";

async function run(pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  const { rows: events } = await pool.query(`
    SELECT id, name, description, date, "endDate", "startTime", "endTime",
           "isYearly", "isDeleted"
    FROM "Event"
    ORDER BY date
  `);

  // Load event<->calendarEdition M:N
  const { rows: eventEditions } = await pool.query(`
    SELECT "A" AS event_id, "B" AS edition_id
    FROM "_CalendarEditionToEvent"
  `);

  const editionsByEvent = new Map<string, string[]>();
  for (const row of eventEditions) {
    if (!editionsByEvent.has(row.event_id)) {
      editionsByEvent.set(row.event_id, []);
    }
    editionsByEvent.get(row.event_id)!.push(row.edition_id);
  }

  log(STEP, `Found ${events.length} events to migrate`);
  let migrated = 0;
  let skipped = 0;

  for (const row of events) {
    if (idMap.has("events", row.id)) {
      skipped++;
      continue;
    }

    const dateTs = toTimestamp(row.date);
    if (!dateTs) {
      log(STEP, `Skipping event ${row.id} "${row.name}": invalid date "${row.date}"`);
      continue;
    }

    // Map calendar edition IDs
    const v1EditionIds = editionsByEvent.get(row.id) ?? [];
    const v2EditionIds: Id<"calendarEditions">[] = [];
    for (const v1Id of v1EditionIds) {
      const v2Id = idMap.get("calendarEditions", v1Id);
      if (v2Id) v2EditionIds.push(v2Id as Id<"calendarEditions">);
    }

    const v2Id = await convex.mutation(api.migration.insertEvent, {
      name: row.name,
      description: row.description ?? undefined,
      date: dateTs,
      endDate: toTimestamp(row.endDate),
      startTime: row.startTime ?? undefined,
      endTime: row.endTime ?? undefined,
      isYearly: row.isYearly ?? undefined,
      calendarEditionIds: v2EditionIds.length > 0 ? v2EditionIds : undefined,
      orgId,
      isDeleted: row.isDeleted || undefined,
    });

    idMap.set("events", row.id, v2Id);
    migrated++;
  }

  idMap.save();
  log(STEP, `Done: ${migrated} migrated, ${skipped} skipped`);
}

export default { name: STEP, run } satisfies MigrationStep;
