import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as idMap from "./id-map";
import { log, type MigrationStep } from "./utils";

const STEP = "01-address-books";

async function run(pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  const { rows } = await pool.query(`
    SELECT id, name, "displayLevel"
    FROM "AddressBook"
    WHERE "isDeleted" = false
    ORDER BY name
  `);

  log(STEP, `Found ${rows.length} address books to migrate`);
  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (idMap.has("addressBooks", row.id)) {
      skipped++;
      continue;
    }

    const v2Id = await convex.mutation(api.migration.insertAddressBook, {
      name: row.name,
      displayLevel: row.displayLevel ?? undefined,
      orgId,
    });

    idMap.set("addressBooks", row.id, v2Id);
    migrated++;
  }

  idMap.save();
  log(STEP, `Done: ${migrated} migrated, ${skipped} skipped (already mapped)`);
}

export default { name: STEP, run } satisfies MigrationStep;
