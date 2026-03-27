import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import * as idMap from "./id-map";
import { log, decimalToCents, toTimestamp, type MigrationStep } from "./utils";

const STEP = "10-payments";

async function run(pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  const { rows } = await pool.query(`
    SELECT
      id,
      "paymentDate",
      amount,
      "purchaseId",
      "checkNumber",
      "paymentMethod",
      "wasPrepaid"
    FROM "Payment"
    ORDER BY "paymentDate"
  `);

  log(STEP, `Found ${rows.length} payments to migrate`);
  let migrated = 0;
  let skipped = 0;
  let noMapping = 0;

  for (const row of rows) {
    if (idMap.has("payments", row.id)) {
      skipped++;
      continue;
    }

    const purchaseV2 = idMap.get("purchases", row.purchaseId);
    if (!purchaseV2) {
      log(STEP, `Skipping payment ${row.id}: no purchase mapping for ${row.purchaseId}`);
      noMapping++;
      continue;
    }

    const dateTs = toTimestamp(row.paymentDate);
    if (!dateTs) {
      log(STEP, `Skipping payment ${row.id}: invalid date "${row.paymentDate}"`);
      continue;
    }

    const v2Id = await convex.mutation(api.migration.insertPayment, {
      purchaseId: purchaseV2 as Id<"purchases">,
      amount: decimalToCents(row.amount),
      date: dateTs,
      method: row.paymentMethod ?? undefined,
      checkNumber: row.checkNumber ?? undefined,
      isPrepaid: row.wasPrepaid || undefined,
      orgId,
    });

    idMap.set("payments", row.id, v2Id);
    migrated++;
  }

  idMap.save();
  log(STEP, `Done: ${migrated} migrated, ${skipped} skipped, ${noMapping} skipped (no mapping)`);
}

export default { name: STEP, run } satisfies MigrationStep;
