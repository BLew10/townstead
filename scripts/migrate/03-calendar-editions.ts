import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as idMap from "./id-map";
import { log, type MigrationStep } from "./utils";

const STEP = "03-calendar-editions";

async function run(pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  const { rows } = await pool.query(`
    SELECT id, name, code, "isDeleted"
    FROM "CalendarEdition"
    ORDER BY name
  `);

  log(STEP, `Found ${rows.length} calendar editions to migrate`);
  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (idMap.has("calendarEditions", row.id)) {
      skipped++;
      continue;
    }

    const v2Id = await convex.mutation(api.migration.insertCalendarEdition, {
      name: row.name,
      code: row.code ?? row.name.toLowerCase().replace(/\s+/g, "-"),
      orgId,
      isDeleted: row.isDeleted || undefined,
    });

    idMap.set("calendarEditions", row.id, v2Id);
    migrated++;
  }

  idMap.save();
  log(STEP, `Done: ${migrated} migrated, ${skipped} skipped`);
}

export default { name: STEP, run } satisfies MigrationStep;
