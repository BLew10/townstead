import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { log, type MigrationStep } from "./utils";

const STEP = "09b-repair-schedules";

/**
 * Post-migration repair step.
 *
 * After step 09 migrates v1 scheduled payments, some purchases may have
 * incomplete schedules (skipped rows due to missing mappings or invalid dates).
 * This step regenerates scheduled payments from existing paymentTerms for any
 * purchase where the sum of scheduled payments doesn't match scheduleBase.
 *
 * Safe to re-run: only touches purchases with mismatched totals.
 */
async function run(_pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  const mismatches = await convex.query(
    api.billing.queries.auditScheduledPayments,
    { orgId }
  );

  log(STEP, `Found ${mismatches.length} purchases with incomplete schedules`);

  if (mismatches.length === 0) {
    log(STEP, "No repairs needed");
    return;
  }

  let repaired = 0;
  let failed = 0;

  for (const m of mismatches) {
    try {
      const result = await convex.mutation(
        api.purchases.mutations.regenerateSchedule,
        {
          purchaseId: m.purchaseId as Id<"purchases">,
          orgId,
        }
      );
      log(
        STEP,
        `Repaired ${m.company || m.contactName} (${m.invoiceNumber ?? "no invoice"}, year ${m.year}): ` +
          `deleted ${result.deletedCount} → created ${result.createdCount} (scheduleBase=${result.scheduleBase})`
      );
      repaired++;
    } catch (err) {
      log(STEP, `Failed to repair purchase ${m.purchaseId}: ${err}`);
      failed++;
    }
  }

  log(STEP, `Done: ${repaired} repaired, ${failed} failed`);
}

export default { name: STEP, run } satisfies MigrationStep;
