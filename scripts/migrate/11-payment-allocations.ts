import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import * as idMap from "./id-map";
import { log, decimalToCents, type MigrationStep } from "./utils";

const STEP = "11-payment-allocations";

async function run(pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  const { rows } = await pool.query(`
    SELECT id, "paymentId", "scheduledPaymentId", "allocatedAmount"
    FROM "PaymentAllocation"
    ORDER BY id
  `);

  log(STEP, `Found ${rows.length} payment allocations to migrate`);
  let migrated = 0;
  let skipped = 0;
  let noMapping = 0;

  for (const row of rows) {
    if (idMap.has("paymentAllocations", row.id)) {
      skipped++;
      continue;
    }

    const paymentV2 = idMap.get("payments", row.paymentId);
    const scheduledPaymentV2 = idMap.get("scheduledPayments", row.scheduledPaymentId);

    if (!paymentV2 || !scheduledPaymentV2) {
      log(
        STEP,
        `Skipping allocation ${row.id}: missing payment (${row.paymentId}) or scheduled payment (${row.scheduledPaymentId}) mapping`
      );
      noMapping++;
      continue;
    }

    const v2Id = await convex.mutation(api.migration.insertPaymentAllocation, {
      paymentId: paymentV2 as Id<"payments">,
      scheduledPaymentId: scheduledPaymentV2 as Id<"scheduledPayments">,
      amount: decimalToCents(row.allocatedAmount),
      orgId,
    });

    idMap.set("paymentAllocations", row.id, v2Id);
    migrated++;
  }

  idMap.save();
  log(STEP, `Done: ${migrated} migrated, ${skipped} skipped, ${noMapping} skipped (no mapping)`);
}

export default { name: STEP, run } satisfies MigrationStep;
