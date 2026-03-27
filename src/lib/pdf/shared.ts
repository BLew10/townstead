import { PDFDocument, PDFPage, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { format } from "date-fns";
import { formatCurrency } from "../utils";

const MARGIN = 50;
const LINE_HEIGHT = 16;

/** @deprecated Use `formatCurrency` from `@/lib/utils` directly. */
export const fmtCurrency = formatCurrency;

export function fmtDate(timestamp: number): string {
  return format(new Date(timestamp), "MMM d, yyyy");
}

export function fmtDateShort(timestamp: number): string {
  return format(new Date(timestamp), "MM-dd-yyyy");
}

export interface PdfContext {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  boldFont: PDFFont;
  timesFont: PDFFont;
  timesBoldFont: PDFFont;
  y: number;
  width: number;
  height: number;
}

export async function createPdfContext(
  landscape = false
): Promise<PdfContext> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const timesFont = await doc.embedFont(StandardFonts.TimesRoman);
  const timesBoldFont = await doc.embedFont(StandardFonts.TimesRomanBold);

  const width = landscape ? 792 : 612;
  const height = landscape ? 612 : 792;
  const page = doc.addPage([width, height]);

  return {
    doc,
    page,
    font,
    boldFont,
    timesFont,
    timesBoldFont,
    y: height - MARGIN,
    width,
    height,
  };
}

function getFont(ctx: PdfContext, bold?: boolean, times?: boolean): PDFFont {
  if (times) return bold ? ctx.timesBoldFont : ctx.timesFont;
  return bold ? ctx.boldFont : ctx.font;
}

export function drawText(
  ctx: PdfContext,
  text: string,
  x: number,
  options?: {
    size?: number;
    bold?: boolean;
    times?: boolean;
    color?: ReturnType<typeof rgb>;
    maxWidth?: number;
  }
) {
  const size = options?.size ?? 10;
  const f = getFont(ctx, options?.bold, options?.times);

  let displayText = text;
  if (options?.maxWidth) {
    const textWidth = f.widthOfTextAtSize(text, size);
    if (textWidth > options.maxWidth) {
      while (
        displayText.length > 3 &&
        f.widthOfTextAtSize(displayText + "...", size) > options.maxWidth
      ) {
        displayText = displayText.slice(0, -1);
      }
      displayText += "...";
    }
  }

  ctx.page.drawText(displayText, {
    x,
    y: ctx.y,
    size,
    font: f,
    color: options?.color ?? rgb(0, 0, 0),
  });
}

export function drawWrappedText(
  ctx: PdfContext,
  text: string,
  x: number,
  maxWidth: number,
  options?: {
    size?: number;
    bold?: boolean;
    times?: boolean;
    color?: ReturnType<typeof rgb>;
    lineSpacing?: number;
  }
) {
  const size = options?.size ?? 10;
  const f = getFont(ctx, options?.bold, options?.times);
  const spacing = options?.lineSpacing ?? size + 2;
  const words = text.split(/\s+/);
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (f.widthOfTextAtSize(test, size) > maxWidth && line) {
      ctx.page.drawText(line, {
        x,
        y: ctx.y,
        size,
        font: f,
        color: options?.color ?? rgb(0, 0, 0),
      });
      ctx.y -= spacing;
      checkPageBreak(ctx, spacing);
      line = word;
    } else {
      line = test;
    }
  }

  if (line) {
    ctx.page.drawText(line, {
      x,
      y: ctx.y,
      size,
      font: f,
      color: options?.color ?? rgb(0, 0, 0),
    });
    ctx.y -= spacing;
  }
}

export function drawLine(
  ctx: PdfContext,
  x1: number,
  x2: number,
  options?: { thickness?: number; color?: ReturnType<typeof rgb> }
) {
  ctx.page.drawLine({
    start: { x: x1, y: ctx.y },
    end: { x: x2, y: ctx.y },
    thickness: options?.thickness ?? 0.5,
    color: options?.color ?? rgb(0.7, 0.7, 0.7),
  });
}

export function drawDashedLine(
  ctx: PdfContext,
  x1: number,
  x2: number,
  options?: { dashLength?: number; gapLength?: number }
) {
  const dash = options?.dashLength ?? 4;
  const gap = options?.gapLength ?? 3;
  let x = x1;
  while (x < x2) {
    const end = Math.min(x + dash, x2);
    ctx.page.drawLine({
      start: { x, y: ctx.y },
      end: { x: end, y: ctx.y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    x = end + gap;
  }
}

export function newLine(ctx: PdfContext, lines = 1) {
  ctx.y -= LINE_HEIGHT * lines;
}

export function checkPageBreak(ctx: PdfContext, neededSpace = 60) {
  if (ctx.y < MARGIN + neededSpace) {
    ctx.page = ctx.doc.addPage([ctx.width, ctx.height]);
    ctx.y = ctx.height - MARGIN;
  }
}

export function rightAlignText(
  ctx: PdfContext,
  text: string,
  rightX: number,
  options?: {
    size?: number;
    bold?: boolean;
    times?: boolean;
    color?: ReturnType<typeof rgb>;
  }
) {
  const size = options?.size ?? 10;
  const f = getFont(ctx, options?.bold, options?.times);
  const textWidth = f.widthOfTextAtSize(text, size);
  drawText(ctx, text, rightX - textWidth, options);
}

export function centerText(
  ctx: PdfContext,
  text: string,
  options?: {
    size?: number;
    bold?: boolean;
    times?: boolean;
    color?: ReturnType<typeof rgb>;
  }
) {
  const size = options?.size ?? 10;
  const f = getFont(ctx, options?.bold, options?.times);
  const textWidth = f.widthOfTextAtSize(text, size);
  const x = (ctx.width - textWidth) / 2;
  drawText(ctx, text, x, options);
}

// --------------- V1-style shared sections ---------------

export interface OrgSettingsPdf {
  businessName: string;
  address?: { street?: string; city?: string; state?: string; zip?: string };
  phone?: string;
  email?: string;
  publisherName?: string;
  remitToName?: string;
  remitToAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  showCreditCardSection?: boolean;
  nsfFeeAmount?: number;
}

export interface SponsorContact {
  company?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: { street?: string; city?: string; state?: string; zip?: string };
}

const LEFT = 10;
const RIGHT = 200;

/**
 * jsPDF coordinate system: origin top-left, Y increases downward, units mm.
 * pdf-lib coordinate system: origin bottom-left, Y increases upward, units points (1pt = 1/72 inch).
 * V1 used jsPDF with default (mm, A4: 210x297mm). We map jsPDF's (x_mm, y_mm) to pdf-lib points.
 * A4 ≈ 595.28 x 841.89pt but v1 uses Letter (612x792). jsPDF default is A4 but text positions
 * were authored assuming ~210mm width. We keep the same proportions on US Letter by scaling:
 * x_pt = x_mm * (612/210), y_pt = (297 - y_mm) * (792/297).
 */
function jX(mmX: number): number {
  return mmX * (612 / 210);
}
function jY(ctx: PdfContext, mmY: number): number {
  return ctx.height - mmY * (ctx.height / 297);
}

/**
 * Draw business header matching v1 layout.
 * V1 positions: business info at y=25mm left, phone at y=25mm right, email at y=35mm right.
 */
export function drawBusinessHeader(
  ctx: PdfContext,
  settings: OrgSettingsPdf
) {
  const leftX = jX(LEFT);
  const rightX = jX(RIGHT);
  const size = 10;

  let y = jY(ctx, 25);
  ctx.page.drawText(settings.businessName, {
    x: leftX,
    y,
    size,
    font: ctx.timesFont,
  });

  if (settings.address?.street) {
    y = jY(ctx, 30);
    ctx.page.drawText(settings.address.street, {
      x: leftX,
      y,
      size,
      font: ctx.timesFont,
    });
  }

  const cityStateZip = [
    settings.address?.city,
    settings.address?.state,
    settings.address?.zip,
  ]
    .filter(Boolean)
    .join(", ");
  if (cityStateZip) {
    y = jY(ctx, 35);
    ctx.page.drawText(cityStateZip, {
      x: leftX,
      y,
      size,
      font: ctx.timesFont,
    });
  }

  if (settings.phone) {
    const phoneText = `Tel: ${settings.phone}`;
    const tw = ctx.timesFont.widthOfTextAtSize(phoneText, size);
    ctx.page.drawText(phoneText, {
      x: rightX * (612 / 210) / (200 / 210) - tw,
      y: jY(ctx, 25),
      size,
      font: ctx.timesFont,
    });
  }

  if (settings.email) {
    const tw = ctx.timesFont.widthOfTextAtSize(settings.email, size);
    ctx.page.drawText(settings.email, {
      x: jX(RIGHT) - tw,
      y: jY(ctx, 35),
      size,
      font: ctx.timesFont,
    });
  }
}

/**
 * Draw the sponsor (Bill To) block and publisher/year/date info.
 * Returns the pdf-lib Y coordinate after the block.
 */
export function drawSponsorBlock(
  ctx: PdfContext,
  settings: OrgSettingsPdf,
  contact: SponsorContact,
  opts: {
    year?: number;
    createdAt?: number;
    invoiceNumber?: string;
    showInvoiceLabel?: boolean;
  }
): number {
  const leftX = jX(LEFT);
  const rightX = jX(RIGHT);
  const size = 10;

  let topMm = 50;

  if (settings.publisherName) {
    ctx.page.drawText(`Publisher: ${settings.publisherName}`, {
      x: leftX,
      y: jY(ctx, topMm),
      size,
      font: ctx.timesFont,
    });
  }

  if (opts.year) {
    const yearText = `${opts.year} Calendar`;
    const tw = ctx.timesFont.widthOfTextAtSize(yearText, size);
    ctx.page.drawText(yearText, {
      x: rightX - tw,
      y: jY(ctx, topMm),
      size,
      font: ctx.timesFont,
    });
  }

  if (opts.createdAt) {
    const dateText = fmtDateShort(opts.createdAt);
    const tw = ctx.timesFont.widthOfTextAtSize(dateText, size);
    ctx.page.drawText(dateText, {
      x: rightX - tw,
      y: jY(ctx, topMm + 5),
      size,
      font: ctx.timesFont,
    });
  }

  if (opts.invoiceNumber) {
    const invText = `INVOICE #${opts.invoiceNumber}`;
    const tw = ctx.timesBoldFont.widthOfTextAtSize(invText, size);
    ctx.page.drawText(invText, {
      x: rightX - tw,
      y: jY(ctx, 70),
      size,
      font: ctx.timesBoldFont,
    });
  }

  let sponsorMm = 80;

  if (contact.phone) {
    const phoneText = `Tel: ${contact.phone}`;
    const tw = ctx.timesFont.widthOfTextAtSize(phoneText, size);
    ctx.page.drawText(phoneText, {
      x: rightX - tw,
      y: jY(ctx, sponsorMm),
      size,
      font: ctx.timesFont,
    });
  }

  if (contact.email) {
    const tw = ctx.timesFont.widthOfTextAtSize(contact.email, size);
    ctx.page.drawText(contact.email, {
      x: rightX - tw,
      y: jY(ctx, sponsorMm + 10),
      size,
      font: ctx.timesFont,
    });
  }

  ctx.page.drawText("Sponsor:", {
    x: leftX,
    y: jY(ctx, sponsorMm),
    size,
    font: ctx.timesFont,
  });

  let currentMm = sponsorMm;
  if (contact.company) {
    currentMm += 5;
    ctx.page.drawText(contact.company, {
      x: leftX,
      y: jY(ctx, currentMm),
      size,
      font: ctx.timesFont,
    });
  }

  if (contact.address?.street) {
    currentMm += 5;
    ctx.page.drawText(contact.address.street, {
      x: leftX,
      y: jY(ctx, currentMm),
      size,
      font: ctx.timesFont,
    });
  }

  const csz = [
    contact.address?.city ? `${contact.address.city},` : "",
    contact.address?.state ?? "",
    contact.address?.zip ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  if (csz) {
    currentMm += 5;
    ctx.page.drawText(csz, {
      x: leftX,
      y: jY(ctx, currentMm),
      size,
      font: ctx.timesFont,
    });
  }

  return jY(ctx, currentMm + 10);
}

/**
 * Generate the ordinal suffix for a day-of-month number.
 */
export function daySuffix(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  const last = day % 10;
  if (last === 1) return `${day}st`;
  if (last === 2) return `${day}nd`;
  if (last === 3) return `${day}rd`;
  return `${day}th`;
}

/**
 * Draw footer text and tear-off section matching v1 exactly.
 * This is positioned from the bottom of the page.
 */
export function drawFooterAndTearoff(
  ctx: PdfContext,
  settings: OrgSettingsPdf,
  terms?: {
    dueDayOfMonth?: number;
    paymentOnLastDay?: boolean;
    lateFeeAmount?: number;
    lateFeeType?: string;
    firstPaymentDate?: string;
  }
) {
  const leftX = jX(LEFT);
  const rightX = jX(RIGHT);
  const size = 10;

  const dueDay = terms?.dueDayOfMonth
    ? terms.paymentOnLastDay
      ? "last day"
      : daySuffix(terms.dueDayOfMonth)
    : "15th";

  let lateFeeMessage = "";
  if (terms?.lateFeeAmount && terms.lateFeeAmount > 0) {
    const feeText =
      terms.lateFeeType === "percent"
        ? `${terms.lateFeeAmount}%`
        : `$${(terms.lateFeeAmount / 100).toFixed(2)}`;
    const startDate = terms.firstPaymentDate ?? "";
    lateFeeMessage = ` Starting ${startDate}, a late fee of ${feeText} will be charged for payments not received by the ${dueDay} of each month.`;
  }

  const nsfAmount = settings.nsfFeeAmount
    ? `$${(settings.nsfFeeAmount / 100).toFixed(2)}`
    : "$25.00";

  const footerText = `Thank you for Sponsoring your Community Calendar. Please be aware payments are to be received no later than the ${dueDay} of each month.${lateFeeMessage} A ${nsfAmount} fee will be charged for any NSF payment. Thank you.`;

  // Position footer ~94mm from bottom, or ensure enough space
  const footerStartY = Math.min(ctx.y - 20, jY(ctx, 297 - 94));
  ctx.y = footerStartY;
  checkPageBreak(ctx, 200);

  drawWrappedText(ctx, footerText, leftX, rightX - leftX, {
    size,
    times: true,
    lineSpacing: 12,
  });

  ctx.y -= 8;

  // Dashed separator
  const separatorText =
    "-------------------------Please return the below portion with your payment------------------------";
  const tw = ctx.timesBoldFont.widthOfTextAtSize(separatorText, size);
  ctx.page.drawText(separatorText, {
    x: (ctx.width - tw) / 2,
    y: ctx.y,
    size,
    font: ctx.timesBoldFont,
  });
  ctx.y -= 14;

  // Remit-to section
  const remitStartY = ctx.y;
  ctx.page.drawText("Please remit to:", {
    x: leftX,
    y: ctx.y,
    size,
    font: ctx.timesBoldFont,
  });
  ctx.y -= 12;

  const remitName =
    settings.remitToName || settings.businessName;
  ctx.page.drawText(remitName, {
    x: leftX,
    y: ctx.y,
    size,
    font: ctx.timesFont,
  });
  ctx.y -= 6;

  const remitAddr = settings.remitToAddress ?? settings.address;
  if (remitAddr?.street) {
    ctx.page.drawText(remitAddr.street, {
      x: leftX,
      y: ctx.y,
      size,
      font: ctx.timesFont,
    });
    ctx.y -= 6;
  }
  const remitCsz = [
    remitAddr?.city ? `${remitAddr.city},` : "",
    remitAddr?.state ?? "",
    remitAddr?.zip ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  if (remitCsz) {
    ctx.page.drawText(remitCsz, {
      x: leftX,
      y: ctx.y,
      size,
      font: ctx.timesFont,
    });
  }

  // Credit card section (right side, same Y as remit)
  if (settings.showCreditCardSection !== false) {
    const ccX = jX(RIGHT - 90);
    let ccY = remitStartY;

    ctx.page.drawText("Credit Card Payments:", {
      x: ccX,
      y: ccY,
      size,
      font: ctx.timesBoldFont,
    });
    ccY -= 12;

    const ccLines = [
      "Name on Card: ____________________________________",
      "Card No.: ________________________________________",
      "Exp. Date: ___________   3-Digit Sec. Code: ___________",
      "Billing Address: __________________________________",
      "Billing Zip/PC: __________  Amt. Paid: $______________",
    ];

    for (const line of ccLines) {
      ctx.page.drawText(line, {
        x: ccX,
        y: ccY,
        size,
        font: ctx.timesFont,
      });
      ccY -= 6;
    }
  }
}

export { MARGIN, LINE_HEIGHT, rgb };
