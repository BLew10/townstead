import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import * as idMap from "./id-map";
import { log, type MigrationStep } from "./utils";

const STEP = "11-payment-allocations";

/**
 * Derives payment allocations using the v2 allocatePayment logic instead of
 * copying v1 allocations. The v1 system had a bug where allocations could be
 * assigned to the wrong installment (month-only matching without year), so we
 * recompute them from scratch: for each purchase, process payments in date
 * order and allocate to the earliest-due unpaid scheduled payment first.
 */
async function run(_pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  const result = await convex.mutation(api.migration.reallocateAllPayments, {
    orgId,
  });

  log(STEP, `Done: ${result.purchasesProcessed} purchases processed, ${result.allocationsCreated} allocations created, ${result.allocationsDeleted} old allocations deleted`);
}

export default { name: STEP, run } satisfies MigrationStep;
