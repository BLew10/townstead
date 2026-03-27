import {
  createPdfContext,
  drawText,
  drawLine,
  newLine,
  rightAlignText,
  checkPageBreak,
  fmtCurrency,
  MARGIN,
  rgb,
} from "./shared";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type MonthCell = { projected: number; actual: number };

interface CashFlowRow {
  contactName: string;
  company: string;
  months: MonthCell[];
  yearTotal: MonthCell;
}

interface CashFlowData {
  editionName: string;
  year: number;
  rows: CashFlowRow[];
  summary: { months: MonthCell[]; yearTotal: MonthCell };
}

export async function generateCashFlowPdf(
  data: CashFlowData
): Promise<Uint8Array> {
  const ctx = await createPdfContext(true); // landscape
  const rightEdge = ctx.width - MARGIN;

  // Title
  drawText(ctx, "CASH FLOW REPORT", MARGIN, { size: 18, bold: true });
  newLine(ctx);
  drawText(ctx, `${data.editionName} — ${data.year}`, MARGIN, {
    size: 12,
    color: rgb(0.4, 0.4, 0.4),
  });
  newLine(ctx, 2);

  // Column layout
  const contactColWidth = 120;
  const monthCols = 12;
  const totalAvailable = rightEdge - MARGIN - contactColWidth - 60;
  const monthColWidth = totalAvailable / monthCols;
  const totalColX = MARGIN + contactColWidth + monthCols * monthColWidth + 10;

  // Header row
  drawText(ctx, "Contact", MARGIN, { size: 7, bold: true });
  for (let i = 0; i < 12; i++) {
    const x = MARGIN + contactColWidth + i * monthColWidth;
    drawText(ctx, MONTHS[i], x + 2, { size: 7, bold: true });
  }
  drawText(ctx, "Year Total", totalColX, { size: 7, bold: true });
  newLine(ctx, 0.5);
  drawLine(ctx, MARGIN, rightEdge);
  newLine(ctx);

  // Data rows
  for (const row of data.rows) {
    checkPageBreak(ctx, 30);

    const contactLabel = row.company || row.contactName;
    drawText(ctx, contactLabel, MARGIN, {
      size: 7,
      maxWidth: contactColWidth - 5,
    });

    for (let i = 0; i < 12; i++) {
      const x = MARGIN + contactColWidth + i * monthColWidth;
      const cell = row.months[i];
      if (cell.projected > 0) {
        drawText(ctx, fmtCurrency(cell.actual), x + 2, { size: 7 });
      } else {
        drawText(ctx, "—", x + 2, {
          size: 7,
          color: rgb(0.6, 0.6, 0.6),
        });
      }
    }

    drawText(ctx, fmtCurrency(row.yearTotal.actual), totalColX, {
      size: 7,
      bold: true,
    });

    newLine(ctx, 0.5);

    // Projected sub-row
    for (let i = 0; i < 12; i++) {
      const x = MARGIN + contactColWidth + i * monthColWidth;
      const cell = row.months[i];
      if (cell.projected > 0) {
        drawText(ctx, `of ${fmtCurrency(cell.projected)}`, x + 2, {
          size: 6,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    }
    drawText(ctx, `of ${fmtCurrency(row.yearTotal.projected)}`, totalColX, {
      size: 6,
      color: rgb(0.5, 0.5, 0.5),
    });
    newLine(ctx, 0.5);
    drawLine(ctx, MARGIN, rightEdge, { color: rgb(0.88, 0.88, 0.88) });
    newLine(ctx, 0.5);
  }

  // Summary row
  newLine(ctx, 0.5);
  drawLine(ctx, MARGIN, rightEdge, { thickness: 1 });
  newLine(ctx);
  drawText(ctx, "TOTALS", MARGIN, { size: 8, bold: true });

  for (let i = 0; i < 12; i++) {
    const x = MARGIN + contactColWidth + i * monthColWidth;
    drawText(ctx, fmtCurrency(data.summary.months[i].actual), x + 2, {
      size: 7,
      bold: true,
    });
  }
  drawText(ctx, fmtCurrency(data.summary.yearTotal.actual), totalColX, {
    size: 8,
    bold: true,
  });
  newLine(ctx, 0.5);
  for (let i = 0; i < 12; i++) {
    const x = MARGIN + contactColWidth + i * monthColWidth;
    drawText(
      ctx,
      `of ${fmtCurrency(data.summary.months[i].projected)}`,
      x + 2,
      { size: 6, color: rgb(0.5, 0.5, 0.5) }
    );
  }
  drawText(
    ctx,
    `of ${fmtCurrency(data.summary.yearTotal.projected)}`,
    totalColX,
    { size: 6, color: rgb(0.5, 0.5, 0.5) }
  );

  return await ctx.doc.save();
}
