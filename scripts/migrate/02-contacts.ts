import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import * as idMap from "./id-map";
import { log, normalizeForDedup, buildSearchText, toTimestamp, type MigrationStep } from "./utils";

const STEP = "02-contacts";

interface V1Contact {
  id: string;
  customerSince: string | null;
  notes: string | null;
  webAddress: string | null;
  category: string | null;
  isDeleted: boolean;
  // ContactContactInformation
  firstName: string | null;
  lastName: string | null;
  altContactFirstName: string | null;
  altContactLastName: string | null;
  salutation: string | null;
  company: string | null;
  // ContactTelecomInformation
  phone: string | null;
  altPhone: string | null;
  fax: string | null;
  email: string | null;
  cellPhone: string | null;
  // ContactAddress
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
}

async function run(pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  // 1. Load all v1 contacts with joins
  const { rows: contacts } = await pool.query<V1Contact>(`
    SELECT
      c.id,
      c."customerSince",
      c.notes,
      c."webAddress",
      c.category,
      c."isDeleted",
      cci."firstName",
      cci."lastName",
      cci."altContactFirstName",
      cci."altContactLastName",
      cci.salutation,
      cci.company,
      cti.phone,
      cti."altPhone",
      cti.fax,
      cti.email,
      cti."cellPhone",
      ca.address,
      ca.address2,
      ca.city,
      ca.state,
      ca.zip,
      ca.country
    FROM "Contact" c
    LEFT JOIN "ContactContactInformation" cci ON cci."contactId" = c.id
    LEFT JOIN "ContactTelecomInformation" cti ON cti."contactId" = c.id
    LEFT JOIN "ContactAddress" ca ON ca."contactId" = c.id
    WHERE c."isDeleted" = false
    ORDER BY c.id
  `);

  log(STEP, `Found ${contacts.length} active contacts`);

  // 2. Load purchase counts per contact
  const { rows: purchaseRows } = await pool.query(`
    SELECT "contactId", COUNT(*)::int AS cnt
    FROM "PurchaseOverview"
    GROUP BY "contactId"
  `);
  const purchaseCountMap = new Map<string, number>();
  for (const row of purchaseRows) {
    purchaseCountMap.set(row.contactId, row.cnt);
  }

  // 3. Load address book memberships
  const { rows: abRows } = await pool.query(`
    SELECT "contactId", "addressBookId"
    FROM "ContactAddressBook"
  `);
  const contactAddressBooks = new Map<string, string[]>();
  for (const row of abRows) {
    if (!contactAddressBooks.has(row.contactId)) {
      contactAddressBooks.set(row.contactId, []);
    }
    contactAddressBooks.get(row.contactId)!.push(row.addressBookId);
  }

  // 4. Group contacts by dedup key
  const groups = new Map<string, V1Contact[]>();
  for (const c of contacts) {
    const key = normalizeForDedup(c.company, c.firstName, c.lastName, c.email);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  // 5. Dedup - pick winners, build redirect map
  const winners: V1Contact[] = [];
  const contactRedirectMap = new Map<string, string>(); // loserV1Id -> winnerV1Id
  const conflictLines: string[] = [];

  for (const [key, group] of groups) {
    if (group.length === 1) {
      winners.push(group[0]);
      continue;
    }

    // Sort: most purchases first, then oldest (first by id as proxy)
    group.sort((a, b) => {
      const aPurchases = purchaseCountMap.get(a.id) ?? 0;
      const bPurchases = purchaseCountMap.get(b.id) ?? 0;
      if (bPurchases !== aPurchases) return bPurchases - aPurchases;
      return a.id.localeCompare(b.id); // oldest UUID first (lexicographic)
    });

    const winner = group[0];
    winners.push(winner);

    // Flag if multiple contacts in this group have purchases
    const withPurchases = group.filter((c) => (purchaseCountMap.get(c.id) ?? 0) > 0);
    if (withPurchases.length > 1) {
      conflictLines.push(`\nDEDUP CONFLICT — Multiple contacts with purchases:`);
      conflictLines.push(`  Dedup Key: ${key}`);
      conflictLines.push(`  Winner: ${winner.id} (${winner.firstName} ${winner.lastName}, ${winner.company}) — ${purchaseCountMap.get(winner.id) ?? 0} purchases`);
      for (const loser of group.slice(1)) {
        if ((purchaseCountMap.get(loser.id) ?? 0) > 0) {
          conflictLines.push(`  Merged: ${loser.id} (${loser.firstName} ${loser.lastName}, ${loser.company}) — ${purchaseCountMap.get(loser.id) ?? 0} purchases`);
        }
      }
    }

    for (const loser of group.slice(1)) {
      contactRedirectMap.set(loser.id, winner.id);
    }
  }

  log(STEP, `${winners.length} unique contacts after dedup (${contactRedirectMap.size} redirected)`);

  // Write conflicts file if any
  if (conflictLines.length > 0) {
    const conflictPath = resolve(__dirname, "dedup-conflicts.txt");
    writeFileSync(conflictPath, conflictLines.join("\n"));
    log(STEP, `⚠️  ${conflictLines.length > 0 ? "Dedup conflicts written to dedup-conflicts.txt — REVIEW BEFORE PROCEEDING" : ""}`);
  }

  // 6. Insert winning contacts into Convex
  let migrated = 0;
  let skipped = 0;

  for (const c of winners) {
    if (idMap.has("contacts", c.id)) {
      skipped++;
      // Still map any losers to the same v2 ID
      for (const [loserId, winnerId] of contactRedirectMap) {
        if (winnerId === c.id) {
          const v2Id = idMap.get("contacts", c.id)!;
          idMap.set("contacts", loserId, v2Id);
        }
      }
      continue;
    }

    // Resolve address book IDs to v2 IDs
    const v1AbIds = contactAddressBooks.get(c.id) ?? [];
    const v2AbIds: Id<"addressBooks">[] = [];
    for (const v1AbId of v1AbIds) {
      const v2AbId = idMap.get("addressBooks", v1AbId);
      if (v2AbId) v2AbIds.push(v2AbId as Id<"addressBooks">);
    }

    const hasAddress = c.address || c.address2 || c.city || c.state || c.zip || c.country;

    const v2Id = await convex.mutation(api.migration.insertContact, {
      firstName: c.firstName ?? "(unknown)",
      lastName: c.lastName ?? "(unknown)",
      company: c.company ?? undefined,
      salutation: c.salutation ?? undefined,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      cellPhone: c.cellPhone ?? undefined,
      fax: c.fax ?? undefined,
      altPhone: c.altPhone ?? undefined,
      altContactFirstName: c.altContactFirstName ?? undefined,
      altContactLastName: c.altContactLastName ?? undefined,
      address: hasAddress
        ? {
            street: c.address ?? undefined,
            street2: c.address2 ?? undefined,
            city: c.city ?? undefined,
            state: c.state ?? undefined,
            zip: c.zip ?? undefined,
            country: c.country ?? undefined,
          }
        : undefined,
      website: c.webAddress ?? undefined,
      categoryId: undefined,
      notes: c.notes ?? undefined,
      customerSince: toTimestamp(c.customerSince),
      addressBookIds: v2AbIds.length > 0 ? v2AbIds : undefined,
      searchText: buildSearchText({
        company: c.company,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
      }),
      orgId,
      isDeleted: false,
      updatedAt: Date.now(),
    });

    idMap.set("contacts", c.id, v2Id);
    migrated++;

    // Map loser IDs to the same v2 ID
    for (const [loserId, winnerId] of contactRedirectMap) {
      if (winnerId === c.id) {
        idMap.set("contacts", loserId, v2Id);
      }
    }
  }

  idMap.save();
  log(STEP, `Done: ${migrated} migrated, ${skipped} skipped, ${contactRedirectMap.size} losers redirected`);
}

export default { name: STEP, run } satisfies MigrationStep;
