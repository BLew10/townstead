/**
 * Pre-migration audit script.
 * Connects to v1 PostgreSQL (read-only) and flags data integrity issues
 * that will affect migration quality.
 *
 * Output: migration-audit-report.json
 *
 * Usage: npm run migrate:audit
 */
import pg from "pg";
import dotenv from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

interface AuditReport {
  timestamp: string;
  summary: {
    totalContacts: number;
    totalPurchases: number;
    totalPayments: number;
    totalScheduledPayments: number;
    totalPaymentAllocations: number;
    duplicateContactGroups: number;
    duplicateContactsTotal: number;
  };
  amountPaidMismatches: Array<{
    paymentOverviewId: string;
    invoiceNumber: string;
    storedAmountPaid: string;
    computedAmountPaid: string;
    difference: string;
  }>;
  isPaidMismatches: Array<{
    paymentOverviewId: string;
    invoiceNumber: string;
    storedIsPaid: boolean;
    computedIsPaid: boolean;
    net: string;
    amountPaid: string;
  }>;
  netMismatches: Array<{
    paymentOverviewId: string;
    invoiceNumber: string;
    storedNet: string;
    computedNet: string;
    totalSale: string;
    discounts: string;
    additionalSales: string;
    trade: string;
  }>;
  orphanedRecords: Array<{
    table: string;
    id: string;
    missingFk: string;
    missingFkTable: string;
  }>;
  contactsWithNoName: Array<{
    contactId: string;
    company: string | null;
    email: string | null;
  }>;
  duplicateContacts: Array<{
    dedupKey: string;
    contactIds: string[];
    purchaseCounts: Record<string, number>;
  }>;
}

function normalizeForDedup(
  company: string | null,
  firstName: string | null,
  lastName: string | null,
  email: string | null
): string {
  return [company, firstName, lastName, email]
    .map((s) => (s ?? "").trim().toLowerCase())
    .join("|");
}

async function main() {
  const url = process.env.V1_DATABASE_URL;
  if (!url) {
    console.error("V1_DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: url });

  console.log("Starting pre-migration audit...\n");

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalContacts: 0,
      totalPurchases: 0,
      totalPayments: 0,
      totalScheduledPayments: 0,
      totalPaymentAllocations: 0,
      duplicateContactGroups: 0,
      duplicateContactsTotal: 0,
    },
    amountPaidMismatches: [],
    isPaidMismatches: [],
    netMismatches: [],
    orphanedRecords: [],
    contactsWithNoName: [],
    duplicateContacts: [],
  };

  // --- Counts ---
  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM "Contact") AS contacts,
      (SELECT COUNT(*) FROM "PurchaseOverview") AS purchases,
      (SELECT COUNT(*) FROM "Payment") AS payments,
      (SELECT COUNT(*) FROM "ScheduledPayment") AS scheduled_payments,
      (SELECT COUNT(*) FROM "PaymentAllocation") AS allocations
  `);
  const c = counts.rows[0];
  report.summary.totalContacts = parseInt(c.contacts);
  report.summary.totalPurchases = parseInt(c.purchases);
  report.summary.totalPayments = parseInt(c.payments);
  report.summary.totalScheduledPayments = parseInt(c.scheduled_payments);
  report.summary.totalPaymentAllocations = parseInt(c.allocations);

  console.log(`Contacts: ${report.summary.totalContacts}`);
  console.log(`Purchases: ${report.summary.totalPurchases}`);
  console.log(`Payments: ${report.summary.totalPayments}`);
  console.log(`Scheduled Payments: ${report.summary.totalScheduledPayments}`);
  console.log(`Payment Allocations: ${report.summary.totalPaymentAllocations}\n`);

  // --- amountPaid mismatches ---
  console.log("Checking amountPaid vs sum of allocations...");
  const amountPaidCheck = await pool.query(`
    SELECT
      po.id,
      po."invoiceNumber",
      po."amountPaid" AS stored,
      COALESCE(SUM(pa."allocatedAmount"), 0) AS computed
    FROM "PaymentOverview" po
    LEFT JOIN "PaymentAllocation" pa ON pa."paymentOverviewId" = po.id
    GROUP BY po.id, po."invoiceNumber", po."amountPaid"
    HAVING ABS(po."amountPaid" - COALESCE(SUM(pa."allocatedAmount"), 0)) > 0.009
  `);
  for (const row of amountPaidCheck.rows) {
    report.amountPaidMismatches.push({
      paymentOverviewId: row.id,
      invoiceNumber: row.invoiceNumber,
      storedAmountPaid: String(row.stored),
      computedAmountPaid: String(row.computed),
      difference: String(parseFloat(row.stored) - parseFloat(row.computed)),
    });
  }
  console.log(`  Found ${report.amountPaidMismatches.length} mismatches\n`);

  // --- isPaid mismatches ---
  console.log("Checking isPaid flag vs computed...");
  const isPaidCheck = await pool.query(`
    SELECT
      po.id,
      po."invoiceNumber",
      po."isPaid" AS stored_is_paid,
      po.net,
      po."amountPaid"
    FROM "PaymentOverview" po
    WHERE (po."isPaid" = true AND po."amountPaid" < po.net)
       OR (po."isPaid" = false AND po."amountPaid" >= po.net AND po.net > 0)
  `);
  for (const row of isPaidCheck.rows) {
    report.isPaidMismatches.push({
      paymentOverviewId: row.id,
      invoiceNumber: row.invoiceNumber,
      storedIsPaid: row.stored_is_paid,
      computedIsPaid: parseFloat(row.amountPaid) >= parseFloat(row.net),
      net: String(row.net),
      amountPaid: String(row.amountPaid),
    });
  }
  console.log(`  Found ${report.isPaidMismatches.length} mismatches\n`);

  // --- Net value mismatches ---
  console.log("Checking net vs computed (totalSale - discounts + additionalSales - trade)...");
  const netCheck = await pool.query(`
    SELECT
      po.id,
      po."invoiceNumber",
      po.net AS stored_net,
      po."totalSale",
      COALESCE(po."additionalDiscount1", 0) + COALESCE(po."additionalDiscount2", 0) AS discounts,
      COALESCE(po."additionalSales1", 0) + COALESCE(po."additionalSales2", 0) AS additional_sales,
      COALESCE(po.trade, 0) AS trade,
      (
        po."totalSale"
        - COALESCE(po."additionalDiscount1", 0) - COALESCE(po."additionalDiscount2", 0)
        + COALESCE(po."additionalSales1", 0) + COALESCE(po."additionalSales2", 0)
        - COALESCE(po.trade, 0)
      ) AS computed_net
    FROM "PaymentOverview" po
    WHERE ABS(
      po.net - (
        po."totalSale"
        - COALESCE(po."additionalDiscount1", 0) - COALESCE(po."additionalDiscount2", 0)
        + COALESCE(po."additionalSales1", 0) + COALESCE(po."additionalSales2", 0)
        - COALESCE(po.trade, 0)
      )
    ) > 0.009
  `);
  for (const row of netCheck.rows) {
    report.netMismatches.push({
      paymentOverviewId: row.id,
      invoiceNumber: row.invoiceNumber,
      storedNet: String(row.stored_net),
      computedNet: String(row.computed_net),
      totalSale: String(row.totalSale),
      discounts: String(row.discounts),
      additionalSales: String(row.additional_sales),
      trade: String(row.trade),
    });
  }
  console.log(`  Found ${report.netMismatches.length} mismatches\n`);

  // --- Orphaned FK records ---
  console.log("Checking for orphaned FK records...");
  const orphanChecks: Array<{
    table: string;
    fkCol: string;
    refTable: string;
  }> = [
    { table: "Payment", fkCol: "purchaseId", refTable: "PurchaseOverview" },
    { table: "Payment", fkCol: "contactId", refTable: "Contact" },
    { table: "Payment", fkCol: "paymentOverviewId", refTable: "PaymentOverview" },
    { table: "PaymentAllocation", fkCol: "paymentId", refTable: "Payment" },
    { table: "PaymentAllocation", fkCol: "scheduledPaymentId", refTable: "ScheduledPayment" },
    { table: "ScheduledPayment", fkCol: "paymentOverviewId", refTable: "PaymentOverview" },
    { table: "AdvertisementPurchase", fkCol: "purchaseId", refTable: "PurchaseOverview" },
    { table: "AdvertisementPurchaseSlot", fkCol: "advertisementPurchaseId", refTable: "AdvertisementPurchase" },
    { table: "PurchaseOverview", fkCol: "contactId", refTable: "Contact" },
  ];

  for (const check of orphanChecks) {
    const result = await pool.query(`
      SELECT t.id, t."${check.fkCol}" AS fk_value
      FROM "${check.table}" t
      LEFT JOIN "${check.refTable}" r ON r.id = t."${check.fkCol}"
      WHERE t."${check.fkCol}" IS NOT NULL AND r.id IS NULL
    `);
    for (const row of result.rows) {
      report.orphanedRecords.push({
        table: check.table,
        id: row.id,
        missingFk: row.fk_value,
        missingFkTable: check.refTable,
      });
    }
  }
  console.log(`  Found ${report.orphanedRecords.length} orphaned records\n`);

  // --- Contacts with no name ---
  console.log("Checking contacts with null firstName AND lastName...");
  const noNameContacts = await pool.query(`
    SELECT c.id, cci.company, cti.email
    FROM "Contact" c
    LEFT JOIN "ContactContactInformation" cci ON cci."contactId" = c.id
    LEFT JOIN "ContactTelecomInformation" cti ON cti."contactId" = c.id
    WHERE (cci."firstName" IS NULL OR cci."firstName" = '')
      AND (cci."lastName" IS NULL OR cci."lastName" = '')
  `);
  for (const row of noNameContacts.rows) {
    report.contactsWithNoName.push({
      contactId: row.id,
      company: row.company,
      email: row.email,
    });
  }
  console.log(`  Found ${report.contactsWithNoName.length} contacts with no name\n`);

  // --- Duplicate contacts ---
  console.log("Checking for duplicate contacts...");
  const allContacts = await pool.query(`
    SELECT c.id, cci.company, cci."firstName", cci."lastName", cti.email
    FROM "Contact" c
    LEFT JOIN "ContactContactInformation" cci ON cci."contactId" = c.id
    LEFT JOIN "ContactTelecomInformation" cti ON cti."contactId" = c.id
    WHERE c."isDeleted" = false
  `);

  const purchaseCounts = await pool.query(`
    SELECT "contactId", COUNT(*)::int AS cnt
    FROM "PurchaseOverview"
    GROUP BY "contactId"
  `);
  const purchaseCountMap = new Map<string, number>();
  for (const row of purchaseCounts.rows) {
    purchaseCountMap.set(row.contactId, row.cnt);
  }

  const groups = new Map<string, string[]>();
  for (const row of allContacts.rows) {
    const key = normalizeForDedup(row.company, row.firstName, row.lastName, row.email);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row.id);
  }

  for (const [key, ids] of groups) {
    if (ids.length > 1) {
      const counts: Record<string, number> = {};
      for (const id of ids) {
        counts[id] = purchaseCountMap.get(id) ?? 0;
      }
      report.duplicateContacts.push({
        dedupKey: key,
        contactIds: ids,
        purchaseCounts: counts,
      });
    }
  }
  report.summary.duplicateContactGroups = report.duplicateContacts.length;
  report.summary.duplicateContactsTotal = report.duplicateContacts.reduce(
    (sum, g) => sum + g.contactIds.length,
    0
  );
  console.log(`  Found ${report.summary.duplicateContactGroups} duplicate groups (${report.summary.duplicateContactsTotal} contacts)\n`);

  // --- Write report ---
  const outputPath = resolve(__dirname, "migration-audit-report.json");
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nAudit report written to ${outputPath}`);

  // --- Summary ---
  const issues =
    report.amountPaidMismatches.length +
    report.isPaidMismatches.length +
    report.netMismatches.length +
    report.orphanedRecords.length +
    report.contactsWithNoName.length;

  if (issues === 0 && report.duplicateContacts.length === 0) {
    console.log("\n✅ No data integrity issues found. Ready to migrate.");
  } else {
    console.log(`\n⚠️  Found ${issues} integrity issues and ${report.duplicateContacts.length} duplicate groups.`);
    console.log("Review migration-audit-report.json before proceeding.");
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
