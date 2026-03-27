import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import * as idMap from "./id-map";
import { log, decimalToCents, toTimestamp, type MigrationStep } from "./utils";

const STEP = "08-ad-purchases";

async function run(pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  // --- Ad Purchases ---
  const { rows: adPurchases } = await pool.query(`
    SELECT id, "advertisementId", charge, quantity, "purchaseId", "isDeleted", "calendarId"
    FROM "AdvertisementPurchase"
    WHERE "isDeleted" = false
    ORDER BY id
  `);

  log(STEP, `Found ${adPurchases.length} ad purchases to migrate`);
  let apMigrated = 0;
  let apSkipped = 0;

  for (const row of adPurchases) {
    if (idMap.has("adPurchases", row.id)) {
      apSkipped++;
      continue;
    }

    const purchaseV2 = row.purchaseId ? idMap.get("purchases", row.purchaseId) : null;
    const adV2 = idMap.get("advertisements", row.advertisementId);

    if (!purchaseV2 || !adV2) {
      log(STEP, `Skipping adPurchase ${row.id}: missing purchase (${row.purchaseId}) or ad (${row.advertisementId}) mapping`);
      continue;
    }

    const editionV2 = idMap.get("calendarEditions", row.calendarId);
    if (!editionV2) {
      log(STEP, `Skipping adPurchase ${row.id}: missing calendarEdition mapping for ${row.calendarId}`);
      continue;
    }

    const v2Id = await convex.mutation(api.migration.insertAdPurchase, {
      purchaseId: purchaseV2 as Id<"purchases">,
      advertisementId: adV2 as Id<"advertisements">,
      calendarEditionId: editionV2 as Id<"calendarEditions">,
      quantity: Number(row.quantity),
      charge: decimalToCents(row.charge) || undefined,
      orgId,
    });

    idMap.set("adPurchases", row.id, v2Id);
    apMigrated++;
  }

  log(STEP, `Ad purchases: ${apMigrated} migrated, ${apSkipped} skipped`);

  // --- Ad Slots ---
  const { rows: adSlots } = await pool.query(`
    SELECT
      id,
      "advertisementPurchaseId",
      month,
      slot,
      date,
      "calendarId",
      "calendarEditionYear",
      "advertisementId"
    FROM "AdvertisementPurchaseSlot"
    WHERE "isDeleted" = false
    ORDER BY "calendarEditionYear", month, slot
  `);

  log(STEP, `Found ${adSlots.length} ad slots to migrate`);
  let slotsMigrated = 0;
  let slotsSkipped = 0;

  for (const row of adSlots) {
    if (idMap.has("adSlots", row.id)) {
      slotsSkipped++;
      continue;
    }

    const adPurchaseV2 = idMap.get("adPurchases", row.advertisementPurchaseId);
    const adV2 = idMap.get("advertisements", row.advertisementId);
    const editionV2 = idMap.get("calendarEditions", row.calendarId);

    if (!adPurchaseV2 || !adV2 || !editionV2) {
      log(STEP, `Skipping slot ${row.id}: missing FK mapping`);
      continue;
    }

    const v2Id = await convex.mutation(api.migration.insertAdSlot, {
      adPurchaseId: adPurchaseV2 as Id<"adPurchases">,
      advertisementId: adV2 as Id<"advertisements">,
      calendarEditionId: editionV2 as Id<"calendarEditions">,
      year: Number(row.calendarEditionYear),
      month: Number(row.month),
      slotNumber: row.slot != null ? Number(row.slot) : undefined,
      date: toTimestamp(row.date),
      orgId,
    });

    idMap.set("adSlots", row.id, v2Id);
    slotsMigrated++;
  }

  idMap.save();
  log(STEP, `Ad slots: ${slotsMigrated} migrated, ${slotsSkipped} skipped`);
}

export default { name: STEP, run } satisfies MigrationStep;
