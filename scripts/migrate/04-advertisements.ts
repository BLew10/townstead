import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as idMap from "./id-map";
import { log, type MigrationStep } from "./utils";

const STEP = "04-advertisements";

async function run(pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  const { rows } = await pool.query(`
    SELECT id, name, "isDayType", "perMonth", "isDeleted"
    FROM "Advertisement"
    ORDER BY name
  `);

  log(STEP, `Found ${rows.length} advertisements to migrate`);
  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (idMap.has("advertisements", row.id)) {
      skipped++;
      continue;
    }

    const slotsPerMonth = row.isDayType ? 35 : Number(row.perMonth ?? 0);

    const v2Id = await convex.mutation(api.migration.insertAdvertisement, {
      name: row.name,
      isDayType: row.isDayType,
      slotsPerMonth,
      orgId,
      isDeleted: row.isDeleted || undefined,
    });

    idMap.set("advertisements", row.id, v2Id);
    migrated++;
  }

  idMap.save();
  log(STEP, `Done: ${migrated} migrated, ${skipped} skipped`);
}

export default { name: STEP, run } satisfies MigrationStep;
