import type pg from "pg";
import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import * as idMap from "./id-map";
import { log, type MigrationStep } from "./utils";

const STEP = "05-layouts";

async function run(pool: pg.Pool, convex: ConvexHttpClient, orgId: string) {
  // --- Layouts ---
  const { rows: layouts } = await pool.query(`
    SELECT id, name, "isDeleted"
    FROM "Layout"
    ORDER BY name
  `);

  log(STEP, `Found ${layouts.length} layouts`);
  let layoutsMigrated = 0;

  for (const row of layouts) {
    if (idMap.has("layouts", row.id)) continue;

    const v2Id = await convex.mutation(api.migration.insertLayout, {
      name: row.name,
      orgId,
      isDeleted: row.isDeleted || undefined,
    });

    idMap.set("layouts", row.id, v2Id);
    layoutsMigrated++;
  }

  log(STEP, `Layouts: ${layoutsMigrated} migrated`);

  // --- Ad Placements ---
  const { rows: placements } = await pool.query(`
    SELECT id, "layoutId", "advertisementId", position, x, y, width, height
    FROM "AdPlacement"
    ORDER BY "layoutId"
  `);

  log(STEP, `Found ${placements.length} ad placements`);
  let placementsMigrated = 0;

  for (const row of placements) {
    if (idMap.has("adPlacements", row.id)) continue;

    const layoutV2 = idMap.get("layouts", row.layoutId);
    const adV2 = idMap.get("advertisements", row.advertisementId);
    if (!layoutV2 || !adV2) {
      log(STEP, `Skipping placement ${row.id}: missing layout or ad mapping`);
      continue;
    }

    const position = row.position === "top" || row.position === "bottom" ? row.position : undefined;

    const v2Id = await convex.mutation(api.migration.insertAdPlacement, {
      layoutId: layoutV2 as Id<"layouts">,
      advertisementId: adV2 as Id<"advertisements">,
      x: Number(row.x),
      y: Number(row.y),
      width: Number(row.width),
      height: Number(row.height),
      position: position as "top" | "bottom" | undefined,
      orgId,
    });

    idMap.set("adPlacements", row.id, v2Id);
    placementsMigrated++;
  }

  log(STEP, `Ad placements: ${placementsMigrated} migrated`);

  // --- Calendar Edition Layouts ---
  const { rows: calLayouts } = await pool.query(`
    SELECT id, "calendarEditionId", "layoutId", year
    FROM "CalendarEditionLayout"
    ORDER BY "calendarEditionId", year
  `);

  log(STEP, `Found ${calLayouts.length} calendar edition layouts`);
  let calLayoutsMigrated = 0;

  for (const row of calLayouts) {
    if (idMap.has("calendarEditionLayouts", row.id)) continue;

    const editionV2 = idMap.get("calendarEditions", row.calendarEditionId);
    const layoutV2 = idMap.get("layouts", row.layoutId);
    if (!editionV2 || !layoutV2) {
      log(STEP, `Skipping calendarEditionLayout ${row.id}: missing edition or layout mapping`);
      continue;
    }

    const v2Id = await convex.mutation(api.migration.insertCalendarEditionLayout, {
      calendarEditionId: editionV2 as Id<"calendarEditions">,
      layoutId: layoutV2 as Id<"layouts">,
      year: Number(row.year),
      orgId,
    });

    idMap.set("calendarEditionLayouts", row.id, v2Id);
    calLayoutsMigrated++;
  }

  idMap.save();
  log(STEP, `Calendar edition layouts: ${calLayoutsMigrated} migrated`);
}

export default { name: STEP, run } satisfies MigrationStep;
