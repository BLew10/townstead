import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import * as idMap from "./id-map";
import { log, decimalToCents, toTimestamp, type MigrationStep } from "./utils";

const STEP = "09-scheduled-payments";

async function run(pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  // Build mapping: PaymentOverview.id -> v2 Purchase ID
  const { rows: overviewLinks } = await pool.query(`
    SELECT id, "purchaseId"
    FROM "PaymentOverview"
    WHERE "purchaseId" IS NOT NULL
  `);

  const purchaseByOverview = new Map<string, string>();
  for (const row of overviewLinks) {
    const purchaseV2 = idMap.get("purchases", row.purchaseId);
    if (purchaseV2) {
      purchaseByOverview.set(row.id, purchaseV2);
    }
  }

  // Only migrate source-of-truth fields: dueDate, amount, month, year, lateFeeWaived
  const { rows } = await pool.query(`
    SELECT
      sp.id,
      sp."dueDate",
      sp."dueDateTimeStamp",
      sp.month,
      sp.year,
      sp.amount,
      sp."lateFeeWaived",
      sp."paymentOverviewId"
    FROM "ScheduledPayment" sp
    ORDER BY sp.year, sp.month
  `);

  log(STEP, `Found ${rows.length} scheduled payments to migrate`);
  let migrated = 0;
  let skipped = 0;
  let noMapping = 0;

  for (const row of rows) {
    if (idMap.has("scheduledPayments", row.id)) {
      skipped++;
      continue;
    }

    const purchaseV2 = purchaseByOverview.get(row.paymentOverviewId);
    if (!purchaseV2) {
      log(STEP, `Skipping scheduled payment ${row.id}: no purchase mapping for overview ${row.paymentOverviewId}`);
      noMapping++;
      continue;
    }

    // Prefer dueDateTimeStamp (actual Date) over dueDate (string)
    let dueDateTs: number | undefined;
    if (row.dueDateTimeStamp) {
      dueDateTs = new Date(row.dueDateTimeStamp).getTime();
    } else {
      dueDateTs = toTimestamp(row.dueDate);
    }

    if (!dueDateTs) {
      log(STEP, `Skipping scheduled payment ${row.id}: invalid dueDate "${row.dueDate}"`);
      continue;
    }

    const v2Id = await convex.mutation(api.migration.insertScheduledPayment, {
      purchaseId: purchaseV2 as Id<"purchases">,
      dueDate: dueDateTs,
      amount: decimalToCents(row.amount),
      month: Number(row.month),
      year: Number(row.year),
      lateFeeWaived: row.lateFeeWaived || undefined,
      orgId,
    });

    idMap.set("scheduledPayments", row.id, v2Id);
    migrated++;
  }

  idMap.save();
  log(STEP, `Done: ${migrated} migrated, ${skipped} skipped, ${noMapping} skipped (no mapping)`);
}

export default { name: STEP, run } satisfies MigrationStep;
