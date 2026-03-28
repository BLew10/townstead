import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import * as idMap from "./id-map";
import { log, type MigrationStep } from "./utils";

const STEP = "03b-communities";

/**
 * Auto-creates a community for each calendar edition so that events,
 * blog posts, coupons, and videos can be scoped to communities rather
 * than directly to calendar editions.
 */
async function run(pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  const { rows: editions } = await pool.query(`
    SELECT id, name, code, "isDeleted"
    FROM "CalendarEdition"
    ORDER BY name
  `);

  log(STEP, `Found ${editions.length} calendar editions to create communities from`);
  let migrated = 0;
  let skipped = 0;

  for (const row of editions) {
    if (idMap.has("communities", row.id)) {
      skipped++;
      continue;
    }

    const v2EditionId = idMap.get("calendarEditions", row.id);
    if (!v2EditionId) {
      log(STEP, `Skipping edition ${row.id} "${row.name}": no v2 calendarEdition mapping found`);
      continue;
    }

    const slug = (row.code ?? row.name)
      .toLowerCase()
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "");

    const v2Id = await convex.mutation(api.migration.insertCommunity, {
      name: row.name,
      slug,
      calendarEditionIds: [v2EditionId as Id<"calendarEditions">],
      orgId,
      isDeleted: row.isDeleted || undefined,
    });

    // Key communities by the same v1 edition ID so 06-events can look up
    // the community that corresponds to a v1 edition.
    idMap.set("communities", row.id, v2Id);
    migrated++;
  }

  idMap.save();
  log(STEP, `Done: ${migrated} migrated, ${skipped} skipped`);
}

export default { name: STEP, run } satisfies MigrationStep;
