/**
 * Migration orchestrator.
 * Runs all migration steps in FK-dependency order.
 *
 * Usage: npm run migrate:run
 *
 * Idempotent: safe to re-run. Steps skip records that already have ID mappings.
 * State persisted to scripts/migrate/id-map-state.json between runs.
 */
import { createPgPool, createConvexClient, getOrgId, log } from "./utils";
import * as idMap from "./id-map";
import type { MigrationStep } from "./utils";

import step01 from "./01-address-books";
import step02 from "./02-contacts";
import step03 from "./03-calendar-editions";
import step03b from "./03b-communities";
import step04 from "./04-advertisements";
import step06 from "./06-events";
import step07 from "./07-purchases";
import step08 from "./08-ad-purchases";
import step09 from "./09-scheduled-payments";
import step09b from "./09b-repair-schedules";
import step10 from "./10-payments";
import step11 from "./11-payment-allocations";

const steps: MigrationStep[] = [
  step01,
  step02,
  step03,
  step03b,
  step04,
  step06,
  step07,
  step08,
  step09,
  step09b,
  step10,
  step11,
];

async function main() {
  const pool = createPgPool();
  const convex = createConvexClient();
  const orgId = getOrgId();

  // Load any existing ID mappings from a previous (partial) run
  idMap.load();

  log("orchestrator", `Starting migration with ${steps.length} steps`);
  log("orchestrator", `Org ID: ${orgId}`);
  log("orchestrator", `Existing mappings loaded: ${["addressBooks", "contacts", "calendarEditions", "communities", "advertisements", "events", "purchases", "paymentTerms", "adPurchases", "adSlots", "scheduledPayments", "payments", "paymentAllocations"].map((t) => `${t}=${idMap.getTableSize(t)}`).join(", ")}`);

  const startTime = Date.now();

  for (const step of steps) {
    const stepStart = Date.now();
    log("orchestrator", `\n${"=".repeat(60)}`);
    log("orchestrator", `Starting: ${step.name}`);
    log("orchestrator", `${"=".repeat(60)}`);

    try {
      await step.run(pool, convex, orgId);
    } catch (err) {
      log("orchestrator", `❌ Step ${step.name} FAILED`);
      console.error(err);
      log("orchestrator", "Saving ID map state before exit...");
      idMap.save();
      await pool.end();
      process.exit(1);
    }

    const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
    log("orchestrator", `✅ ${step.name} completed in ${elapsed}s`);
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log("orchestrator", `\n${"=".repeat(60)}`);
  log("orchestrator", `Migration complete in ${totalElapsed}s`);
  log("orchestrator", `${"=".repeat(60)}`);

  // Final summary
  const tables = [
    "addressBooks", "contacts", "calendarEditions", "communities", "advertisements",
    "events", "purchases", "paymentTerms", "adPurchases", "adSlots",
    "scheduledPayments", "payments", "paymentAllocations",
  ];
  log("orchestrator", "\nFinal record counts:");
  for (const t of tables) {
    log("orchestrator", `  ${t}: ${idMap.getTableSize(t)}`);
  }

  idMap.save();
  await pool.end();
  log("orchestrator", "\nRun 'npm run migrate:validate' to verify the migration.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
