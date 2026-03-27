import type { PDFFont } from "pdf-lib";
import {
  createPdfContext,
  drawText,
  drawLine,
  newLine,
  checkPageBreak,
  MARGIN,
  LINE_HEIGHT,
  rgb,
  type PdfContext,
} from "./shared";
import type { EventExportMonthGroup } from "@/lib/events-export";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function wrapLines(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let line = "";

  const pushWord = (word: string) => {
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      return word;
    }
    let rest = word;
    while (rest.length > 0) {
      let cut = rest.length;
      while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) {
        cut -= 1;
      }
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    return "";
  };

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = pushWord(word);
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrappedParagraph(
  ctx: PdfContext,
  x: number,
  maxWidth: number,
  text: string,
  size: number
) {
  const lines = wrapLines(ctx.font, text, size, maxWidth);
  for (const ln of lines) {
    checkPageBreak(ctx, size + 4);
    drawText(ctx, ln, x, { size });
    newLine(ctx, size / LINE_HEIGHT);
  }
}

export interface EventsExportPdfInput {
  year: number;
  editionLabel?: string;
  months: EventExportMonthGroup[];
}

export async function generateEventsExportPdf(
  data: EventsExportPdfInput
): Promise<Uint8Array> {
  const ctx = await createPdfContext(true);
  const rightEdge = ctx.width - MARGIN;
  const contentWidth = rightEdge - MARGIN;

  drawText(ctx, `Event calendar — ${data.year}`, MARGIN, { size: 18, bold: true });
  newLine(ctx);
  if (data.editionLabel) {
    drawText(ctx, data.editionLabel, MARGIN, {
      size: 11,
      color: rgb(0.4, 0.4, 0.4),
    });
    newLine(ctx);
  }
  newLine(ctx);

  for (const group of data.months) {
    if (group.items.length === 0) continue;

    checkPageBreak(ctx, 80);
    drawText(ctx, MONTH_NAMES[group.monthIndex], MARGIN, { size: 13, bold: true });
    newLine(ctx, 0.4);
    drawLine(ctx, MARGIN, rightEdge);
    newLine(ctx);

    for (const item of group.items) {
      checkPageBreak(ctx, 72);
      drawText(ctx, item.name, MARGIN, { size: 11, bold: true });
      newLine(ctx, 0.85);
      drawText(ctx, `${item.dateStr} · ${item.times}`, MARGIN, {
        size: 9,
        color: rgb(0.35, 0.35, 0.35),
      });
      newLine(ctx, 0.85);
      drawWrappedParagraph(ctx, MARGIN, contentWidth, item.description, 9);
      newLine(ctx, 0.5);
    }
    newLine(ctx);
  }

  const bytes = await ctx.doc.save();
  return bytes;
}
