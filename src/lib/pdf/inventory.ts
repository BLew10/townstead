import {
  createPdfContext,
  drawText,
  drawLine,
  newLine,
  checkPageBreak,
  MARGIN,
  rgb,
} from "./shared";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface InventoryPdfSlot {
  month: number;
  slotNumber: number | null;
  company: string;
  contactName: string;
  advertisementName: string;
  advertisementId: string;
  isDayType: boolean;
}

interface EditionBlock {
  editionName: string;
  slots: InventoryPdfSlot[];
}

export interface InventoryPdfData {
  year: number;
  editions: EditionBlock[];
}

function formatMonthCell(isDayType: boolean, slots: InventoryPdfSlot[]): string {
  if (slots.length === 0) return "—";
  if (isDayType) {
    const nums = [
      ...new Set(
        slots
          .map((s) => s.slotNumber)
          .filter((n): n is number => n != null)
      ),
    ].sort((a, b) => a - b);
    return nums.length ? nums.join(", ") : "—";
  }
  const labels = [
    ...new Set(slots.map((s) => (s.company || s.contactName).trim() || "—")),
  ];
  if (labels.length === 1) return labels[0];
  return `${labels[0]} +${labels.length - 1}`;
}

function buildRows(slots: InventoryPdfSlot[]) {
  const byAd = new Map<
    string,
    {
      adName: string;
      isDayType: boolean;
      byMonth: Map<number, InventoryPdfSlot[]>;
    }
  >();

  for (const s of slots) {
    const key = s.advertisementId;
    if (!byAd.has(key)) {
      byAd.set(key, {
        adName: s.advertisementName,
        isDayType: s.isDayType,
        byMonth: new Map(),
      });
    }
    const entry = byAd.get(key)!;
    if (!entry.byMonth.has(s.month)) {
      entry.byMonth.set(s.month, []);
    }
    entry.byMonth.get(s.month)!.push(s);
  }

  return [...byAd.values()]
    .sort((a, b) => a.adName.localeCompare(b.adName))
    .map((r) => ({
      adName: r.adName,
      isDayType: r.isDayType,
      months: Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const list = r.byMonth.get(month) ?? [];
        return formatMonthCell(r.isDayType, list);
      }),
    }));
}

export async function generateInventoryPdf(
  data: InventoryPdfData
): Promise<Uint8Array> {
  const ctx = await createPdfContext(true);
  const rightEdge = ctx.width - MARGIN;

  drawText(ctx, "CALENDAR AD INVENTORY", MARGIN, { size: 18, bold: true });
  newLine(ctx);
  drawText(ctx, String(data.year), MARGIN, {
    size: 12,
    color: rgb(0.4, 0.4, 0.4),
  });
  newLine(ctx, 2);

  const adColWidth = 128;
  const monthColWidth = (rightEdge - MARGIN - adColWidth) / 12;

  let drewTable = false;
  for (const edition of data.editions) {
    const rows = buildRows(edition.slots);
    if (rows.length === 0) continue;

    drewTable = true;
    checkPageBreak(ctx, 80);
    drawText(ctx, edition.editionName, MARGIN, { size: 12, bold: true });
    newLine(ctx, 1.5);

    drawText(ctx, "Advertisement", MARGIN, { size: 7, bold: true });
    for (let i = 0; i < 12; i++) {
      const x = MARGIN + adColWidth + i * monthColWidth;
      drawText(ctx, MONTHS[i], x + 2, { size: 7, bold: true });
    }
    newLine(ctx, 0.5);
    drawLine(ctx, MARGIN, rightEdge);
    newLine(ctx);

    for (const row of rows) {
      checkPageBreak(ctx, 24);
      drawText(ctx, row.adName, MARGIN, {
        size: 7,
        maxWidth: adColWidth - 4,
      });
      for (let i = 0; i < 12; i++) {
        const x = MARGIN + adColWidth + i * monthColWidth;
        const text = row.months[i];
        const isEmpty = text === "—";
        drawText(ctx, text, x + 2, {
          size: 6,
          maxWidth: monthColWidth - 4,
          color: isEmpty ? rgb(0.65, 0.65, 0.65) : rgb(0, 0, 0),
        });
      }
      newLine(ctx, 0.5);
      drawLine(ctx, MARGIN, rightEdge, { color: rgb(0.9, 0.9, 0.9) });
      newLine(ctx, 0.5);
    }

    newLine(ctx, 1.5);
  }

  if (!drewTable) {
    drawText(ctx, "No placements for this selection.", MARGIN, {
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return await ctx.doc.save();
}
