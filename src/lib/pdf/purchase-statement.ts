import {
  createPdfContext,
  drawBusinessHeader,
  drawSponsorBlock,
  drawFooterAndTearoff,
  fmtDateShort,
  rgb,
  type OrgSettingsPdf,
  type SponsorContact,
} from "./shared";

interface LedgerEntry {
  date: number;
  description: string;
  amount: number;
  type: "charge" | "late_fee" | "payment";
}

interface PurchaseStatementData {
  invoiceNumber?: string;
  year: number;
  editionName: string;
  createdAt?: number;
  contact: SponsorContact;
  orgSettings: OrgSettingsPdf;
  startingBalance: number;
  ledgerEntries: LedgerEntry[];
  pastDueAmount: number;
  nextPaymentDueDate: number;
  nextPaymentAmount: number;
  totalAmountDue: number;
  terms?: {
    dueDayOfMonth?: number;
    paymentOnLastDay?: boolean;
    lateFeeAmount?: number;
    lateFeeType?: string;
  } | null;
}

export async function generatePurchaseStatementPdf(
  data: PurchaseStatementData
): Promise<Uint8Array> {
  const ctx = await createPdfContext();

  const jX = (mmX: number) => mmX * (612 / 210);
  const jY = (mmY: number) => ctx.height - mmY * (ctx.height / 297);

  const LEFT = 10;
  const RIGHT = 200;
  const CENTER = 105;
  const leftX = jX(LEFT);
  const rightX = jX(RIGHT);
  const size = 10;

  // 1. Business header
  drawBusinessHeader(ctx, data.orgSettings);

  // 2. Sponsor block
  drawSponsorBlock(ctx, data.orgSettings, data.contact, {
    year: data.year,
    createdAt: data.createdAt,
  });

  // 3. *****Statement***** banner
  let currentMm = 95;
  const bannerText =
    "*************************Statement*************************";
  const bannerTw = ctx.timesBoldFont.widthOfTextAtSize(bannerText, 16);
  ctx.page.drawText(bannerText, {
    x: (ctx.width - bannerTw) / 2,
    y: jY(currentMm),
    size: 16,
    font: ctx.timesBoldFont,
  });

  currentMm += 14;

  // 4. Right-aligned summary block
  const drawSummaryLine = (text: string, bold = false) => {
    const f = bold ? ctx.timesBoldFont : ctx.timesFont;
    const tw = f.widthOfTextAtSize(text, size);
    ctx.page.drawText(text, {
      x: rightX - tw,
      y: jY(currentMm),
      size,
      font: f,
    });
    currentMm += 8;
  };

  drawSummaryLine(
    `Amount Due this Statement for Invoice #${data.invoiceNumber ?? ""}`
  );
  drawSummaryLine(`PAST DUE AMOUNT: $${(data.pastDueAmount / 100).toFixed(2)}`);

  const nextDueDateStr =
    data.nextPaymentDueDate > 0
      ? fmtDateShort(data.nextPaymentDueDate)
      : "N/A";
  drawSummaryLine(
    `PLUS CURRENT AMOUNT DUE IF PAID BY ${nextDueDateStr}: $${(data.nextPaymentAmount / 100).toFixed(2)}`
  );
  drawSummaryLine(
    `TOTAL AMOUNT DUE IF PAID BY ${nextDueDateStr}: $${(data.totalAmountDue / 100).toFixed(2)}`,
    true
  );

  currentMm += 10;

  // 5. Running-balance table
  // Header line
  ctx.page.drawLine({
    start: { x: jX(15), y: jY(currentMm) },
    end: { x: jX(195), y: jY(currentMm) },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  currentMm += 1;

  // Table header
  const colDate = jX(20);
  const colDesc = jX(60);
  const colAmount = jX(140);
  const colBalance = jX(180);

  const drawTableHeader = () => {
    ctx.page.drawText("Date", {
      x: colDate,
      y: jY(currentMm),
      size,
      font: ctx.timesBoldFont,
    });
    ctx.page.drawText("Description", {
      x: colDesc,
      y: jY(currentMm),
      size,
      font: ctx.timesBoldFont,
    });
    ctx.page.drawText("Amount", {
      x: colAmount,
      y: jY(currentMm),
      size,
      font: ctx.timesBoldFont,
    });
    ctx.page.drawText("Balance", {
      x: colBalance,
      y: jY(currentMm),
      size,
      font: ctx.timesBoldFont,
    });
    currentMm += 2;
    ctx.page.drawLine({
      start: { x: jX(15), y: jY(currentMm) },
      end: { x: jX(195), y: jY(currentMm) },
      thickness: 0.25,
      color: rgb(0, 0, 0),
    });
    currentMm += 5;
  };

  drawTableHeader();

  // First row: original charge
  let balance = data.startingBalance;
  const createdDateStr = data.createdAt
    ? fmtDateShort(data.createdAt)
    : "";
  const chargeDesc = `${data.year} Calendar`;
  const chargeAmountStr = `$${(balance / 100).toFixed(2)}`;

  ctx.page.drawText(createdDateStr, {
    x: colDate,
    y: jY(currentMm),
    size,
    font: ctx.timesFont,
  });
  ctx.page.drawText(chargeDesc, {
    x: colDesc,
    y: jY(currentMm),
    size,
    font: ctx.timesFont,
  });
  ctx.page.drawText(chargeAmountStr, {
    x: colAmount,
    y: jY(currentMm),
    size,
    font: ctx.timesFont,
  });
  ctx.page.drawText(chargeAmountStr, {
    x: colBalance,
    y: jY(currentMm),
    size,
    font: ctx.timesFont,
  });
  currentMm += 6;

  // Ledger entries
  for (const entry of data.ledgerEntries) {
    if (jY(currentMm) < 120) {
      ctx.page = ctx.doc.addPage([ctx.width, ctx.height]);
      ctx.y = ctx.height - 50;
      currentMm = 20;
      drawTableHeader();
    }

    const dateStr = fmtDateShort(entry.date);
    let amountStr: string;

    if (entry.type === "late_fee") {
      balance += entry.amount;
      amountStr = `+$${(entry.amount / 100).toFixed(2)}`;
    } else {
      balance -= entry.amount;
      amountStr = `-$${(entry.amount / 100).toFixed(2)}`;
    }

    ctx.page.drawText(dateStr, {
      x: colDate,
      y: jY(currentMm),
      size,
      font: ctx.timesFont,
    });
    ctx.page.drawText(entry.description, {
      x: colDesc,
      y: jY(currentMm),
      size,
      font: ctx.timesFont,
    });
    ctx.page.drawText(amountStr, {
      x: colAmount,
      y: jY(currentMm),
      size,
      font: ctx.timesFont,
    });
    ctx.page.drawText(`$${(balance / 100).toFixed(2)}`, {
      x: colBalance,
      y: jY(currentMm),
      size,
      font: ctx.timesFont,
    });
    currentMm += 6;
  }

  // 6. Footer and tear-off
  ctx.y = jY(currentMm);

  const firstPaymentDate =
    data.nextPaymentDueDate > 0
      ? fmtDateShort(data.nextPaymentDueDate)
      : undefined;

  drawFooterAndTearoff(ctx, data.orgSettings, {
    dueDayOfMonth: data.terms?.dueDayOfMonth,
    lateFeeAmount: data.terms?.lateFeeAmount,
    lateFeeType: data.terms?.lateFeeType,
    firstPaymentDate,
  });

  return await ctx.doc.save();
}
