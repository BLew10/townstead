import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import * as idMap from "./id-map";
import { log, decimalToCents, toTimestamp, type MigrationStep } from "./utils";

const STEP = "07-purchases";

async function run(pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  // Load purchases with their linked PaymentOverview
  const { rows: purchases } = await pool.query(`
    SELECT
      po.id,
      po."contactId",
      po."calendarEditionYear",
      po."isDeleted",
      po."hasSubmittedArtwork",
      po."createdAt",
      pov.id AS pov_id,
      pov."totalSale",
      pov."additionalDiscount1",
      pov."additionalDiscount2",
      pov."additionalSales1",
      pov."additionalSales2",
      pov.trade,
      pov."earlyPaymentDiscount",
      pov."earlyPaymentDiscountPercent",
      pov."lateFee" AS pov_late_fee,
      pov."lateFeePercent",
      pov."paymentDueOn",
      pov."paymentOnLastDay",
      pov."splitPaymentsEqually",
      pov."deliveryMethod",
      pov."invoiceMessage",
      pov."statementMessage",
      pov."invoiceNumber",
      pov.prepaid
    FROM "PurchaseOverview" po
    LEFT JOIN "PaymentOverview" pov ON pov."purchaseId" = po.id
    ORDER BY po."createdAt"
  `);

  // Load purchase<->calendarEdition M:N
  const { rows: editionJoins } = await pool.query(`
    SELECT "A" AS edition_id, "B" AS purchase_id
    FROM "_CalendarEditionToPurchaseOverview"
  `);

  const editionsByPurchase = new Map<string, string[]>();
  for (const row of editionJoins) {
    if (!editionsByPurchase.has(row.purchase_id)) {
      editionsByPurchase.set(row.purchase_id, []);
    }
    editionsByPurchase.get(row.purchase_id)!.push(row.edition_id);
  }

  log(STEP, `Found ${purchases.length} purchases to migrate`);
  let migrated = 0;
  let skipped = 0;
  let noContact = 0;

  for (const row of purchases) {
    if (idMap.has("purchases", row.id)) {
      skipped++;
      continue;
    }

    // Resolve contact (may be redirected via dedup)
    const contactV2 = idMap.get("contacts", row.contactId);
    if (!contactV2) {
      log(STEP, `Skipping purchase ${row.id}: no contact mapping for ${row.contactId}`);
      noContact++;
      continue;
    }

    // Resolve calendar edition IDs
    const v1EditionIds = editionsByPurchase.get(row.id) ?? [];
    const v2EditionIds: Id<"calendarEditions">[] = [];
    for (const v1Id of v1EditionIds) {
      const v2Id = idMap.get("calendarEditions", v1Id);
      if (v2Id) v2EditionIds.push(v2Id as Id<"calendarEditions">);
    }

    if (v2EditionIds.length === 0) {
      log(STEP, `Warning: purchase ${row.id} has no mapped calendar editions`);
    }

    const now = Date.now();

    // Insert purchase
    const purchaseV2Id = await convex.mutation(api.migration.insertPurchase, {
      contactId: contactV2 as Id<"contacts">,
      calendarEditionIds: v2EditionIds,
      year: Number(row.calendarEditionYear),
      invoiceNumber: row.invoiceNumber ?? undefined,
      orgId,
      isDeleted: row.isDeleted || undefined,
      hasSubmittedArtwork: row.hasSubmittedArtwork || undefined,
      updatedAt: toTimestamp(row.createdAt) ?? now,
    });

    idMap.set("purchases", row.id, purchaseV2Id);

    // Insert payment terms (if PaymentOverview exists)
    if (row.pov_id) {
      // Determine early discount type/amount
      let earlyDiscountType: "flat" | "percent" | undefined;
      let earlyDiscountAmount: number | undefined;
      const earlyFlat = parseFloat(String(row.earlyPaymentDiscount ?? 0));
      const earlyPercent = parseFloat(String(row.earlyPaymentDiscountPercent ?? 0));
      if (earlyFlat > 0) {
        earlyDiscountType = "flat";
        earlyDiscountAmount = decimalToCents(row.earlyPaymentDiscount);
      } else if (earlyPercent > 0) {
        earlyDiscountType = "percent";
        earlyDiscountAmount = earlyPercent;
      }

      // Determine late fee type/amount
      let lateFeeType: "flat" | "percent" | undefined;
      let lateFeeAmount: number | undefined;
      const lateFeeFlat = parseFloat(String(row.pov_late_fee ?? 0));
      const lateFeePercent = parseFloat(String(row.lateFeePercent ?? 0));
      if (lateFeeFlat > 0) {
        lateFeeType = "flat";
        lateFeeAmount = decimalToCents(row.pov_late_fee);
      } else if (lateFeePercent > 0) {
        lateFeeType = "percent";
        lateFeeAmount = lateFeePercent;
      }

      // Determine due day
      let dueDayOfMonth: number | undefined;
      if (row.paymentOnLastDay) {
        dueDayOfMonth = 28;
      } else if (row.paymentDueOn) {
        dueDayOfMonth = Number(row.paymentDueOn);
      }

      const termsV2Id = await convex.mutation(api.migration.insertPaymentTerms, {
        purchaseId: purchaseV2Id as Id<"purchases">,
        totalSale: decimalToCents(row.totalSale),
        discount1: decimalToCents(row.additionalDiscount1) || undefined,
        discount2: decimalToCents(row.additionalDiscount2) || undefined,
        additionalSale1: decimalToCents(row.additionalSales1) || undefined,
        additionalSale2: decimalToCents(row.additionalSales2) || undefined,
        trade: decimalToCents(row.trade) || undefined,
        earlyDiscountType,
        earlyDiscountAmount,
        lateFeeType,
        lateFeeAmount,
        dueDayOfMonth,
        splitEqually: row.splitPaymentsEqually || undefined,
        deliveryMethod: row.deliveryMethod ?? undefined,
        invoiceMessage: row.invoiceMessage ?? undefined,
        statementMessage: row.statementMessage ?? undefined,
        orgId,
        updatedAt: now,
      });

      idMap.set("paymentTerms", row.pov_id, termsV2Id);
    }

    migrated++;
  }

  idMap.save();
  log(STEP, `Done: ${migrated} migrated, ${skipped} skipped, ${noContact} skipped (no contact)`);
}

export default { name: STEP, run } satisfies MigrationStep;
