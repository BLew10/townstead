import {
  createPdfContext,
  drawText,
  drawLine,
  newLine,
  checkPageBreak,
  fmtCurrency,
  MARGIN,
  rgb,
} from "./shared";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatColumnKey(key: string): string {
  const [yearStr, monthStr] = key.split("-");
  const monthIdx = parseInt(monthStr, 10) - 1;
  return `${MONTH_NAMES[monthIdx]} ${yearStr}`;
}

type Cell = { projected: number; actual: number };

interface CashFlowRow {
  contactName: string;
  company: string;
  cells: Cell[];
  total: Cell;
  purchases?: unknown[];
}

interface CashFlowData {
  editionName: string;
  year: number;
  paymentYear?: number;
  columns: string[];
  rows: CashFlowRow[];
  summary: { cells: Cell[]; total: Cell };
}

export async function generateCashFlowPdf(
  data: CashFlowData
): Promise<Uint8Array> {
  const ctx = await createPdfContext(true);
  const rightEdge = ctx.width - MARGIN;

  drawText(ctx, "CASH FLOW REPORT", MARGIN, { size: 18, bold: true });
  newLine(ctx);
  const subtitle = data.paymentYear && data.paymentYear !== data.year
    ? `${data.editionName} — ${data.year} (Payments: ${data.paymentYear})`
    : `${data.editionName} — ${data.year}`;
  drawText(ctx, subtitle, MARGIN, {
    size: 12,
    color: rgb(0.4, 0.4, 0.4),
  });
  newLine(ctx, 2);

  const colCount = data.columns.length;
  const contactColWidth = 120;
  const totalAvailable = rightEdge - MARGIN - contactColWidth - 60;
  const colWidth = Math.min(totalAvailable / colCount, 55);
  const totalColX = MARGIN + contactColWidth + colCount * colWidth + 10;

  drawText(ctx, "Contact", MARGIN, { size: 7, bold: true });
  for (let i = 0; i < colCount; i++) {
    const x = MARGIN + contactColWidth + i * colWidth;
    drawText(ctx, formatColumnKey(data.columns[i]), x + 2, {
      size: 6,
      bold: true,
    });
  }
  drawText(ctx, "Total", totalColX, { size: 7, bold: true });
  newLine(ctx, 0.5);
  drawLine(ctx, MARGIN, rightEdge);
  newLine(ctx);

  for (const row of data.rows) {
    checkPageBreak(ctx, 30);

    const contactLabel = row.company || row.contactName;
    drawText(ctx, contactLabel, MARGIN, {
      size: 7,
      maxWidth: contactColWidth - 5,
    });

    for (let i = 0; i < colCount; i++) {
      const x = MARGIN + contactColWidth + i * colWidth;
      const cell = row.cells[i];
      if (cell.projected > 0 || cell.actual > 0) {
        drawText(ctx, fmtCurrency(cell.actual), x + 2, { size: 7 });
      } else {
        drawText(ctx, "—", x + 2, {
          size: 7,
          color: rgb(0.6, 0.6, 0.6),
        });
      }
    }

    drawText(ctx, fmtCurrency(row.total.actual), totalColX, {
      size: 7,
      bold: true,
    });

    newLine(ctx, 0.5);

    for (let i = 0; i < colCount; i++) {
      const x = MARGIN + contactColWidth + i * colWidth;
      const cell = row.cells[i];
      if (cell.projected > 0 || cell.actual > 0) {
        drawText(ctx, `of ${fmtCurrency(cell.projected)}`, x + 2, {
          size: 6,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    }
    drawText(ctx, `of ${fmtCurrency(row.total.projected)}`, totalColX, {
      size: 6,
      color: rgb(0.5, 0.5, 0.5),
    });
    newLine(ctx, 0.5);
    drawLine(ctx, MARGIN, rightEdge, { color: rgb(0.88, 0.88, 0.88) });
    newLine(ctx, 0.5);
  }

  newLine(ctx, 0.5);
  drawLine(ctx, MARGIN, rightEdge, { thickness: 1 });
  newLine(ctx);
  drawText(ctx, "TOTALS", MARGIN, { size: 8, bold: true });

  for (let i = 0; i < colCount; i++) {
    const x = MARGIN + contactColWidth + i * colWidth;
    drawText(ctx, fmtCurrency(data.summary.cells[i].actual), x + 2, {
      size: 7,
      bold: true,
    });
  }
  drawText(ctx, fmtCurrency(data.summary.total.actual), totalColX, {
    size: 8,
    bold: true,
  });
  newLine(ctx, 0.5);
  for (let i = 0; i < colCount; i++) {
    const x = MARGIN + contactColWidth + i * colWidth;
    drawText(
      ctx,
      `of ${fmtCurrency(data.summary.cells[i].projected)}`,
      x + 2,
      { size: 6, color: rgb(0.5, 0.5, 0.5) }
    );
  }
  drawText(
    ctx,
    `of ${fmtCurrency(data.summary.total.projected)}`,
    totalColX,
    { size: 6, color: rgb(0.5, 0.5, 0.5) }
  );

  return await ctx.doc.save();
}
