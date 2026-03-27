import {
  createPdfContext,
  drawBusinessHeader,
  drawSponsorBlock,
  drawFooterAndTearoff,
  fmtCurrency,
  fmtDate,
  checkPageBreak,
  rgb,
  type OrgSettingsPdf,
  type SponsorContact,
} from "./shared";

interface StatementPurchase {
  invoiceNumber?: string;
  editionName: string;
  year: number;
  net: number;
  amountPaid: number;
  balance: number;
}

interface StatementPayment {
  date: number;
  amount: number;
  method?: string;
  invoiceNumber?: string;
  editionName: string;
  year: number;
}

interface StatementData {
  contact: SponsorContact;
  orgSettings: OrgSettingsPdf;
  purchases: StatementPurchase[];
  payments: StatementPayment[];
  overallBalance: number;
  statementMessage?: string;
}

export async function generateStatementPdf(
  data: StatementData
): Promise<Uint8Array> {
  const ctx = await createPdfContext();

  const jX = (mmX: number) => mmX * (612 / 210);
  const jY = (mmY: number) => ctx.height - mmY * (ctx.height / 297);

  const LEFT = 10;
  const RIGHT = 200;
  const leftX = jX(LEFT);
  const rightX = jX(RIGHT);
  const size = 10;

  // 1. Business header
  drawBusinessHeader(ctx, data.orgSettings);

  // 2. Sponsor block (no invoice number for per-contact statement)
  drawSponsorBlock(ctx, data.orgSettings, data.contact, {});

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
  ctx.y = jY(currentMm);

  // 4. Purchases table
  const pColInv = jX(15);
  const pColEdition = jX(50);
  const pColYear = jX(90);
  const pColNet = jX(120);
  const pColPaid = jX(150);
  const pColBalance = jX(185);

  ctx.page.drawLine({
    start: { x: jX(15), y: ctx.y + 4 },
    end: { x: jX(195), y: ctx.y + 4 },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });

  // Table header
  ctx.page.drawText("Invoice #", { x: pColInv, y: ctx.y - 10, size, font: ctx.timesBoldFont });
  ctx.page.drawText("Edition", { x: pColEdition, y: ctx.y - 10, size, font: ctx.timesBoldFont });
  ctx.page.drawText("Year", { x: pColYear, y: ctx.y - 10, size, font: ctx.timesBoldFont });
  ctx.page.drawText("Net", { x: pColNet, y: ctx.y - 10, size, font: ctx.timesBoldFont });
  ctx.page.drawText("Paid", { x: pColPaid, y: ctx.y - 10, size, font: ctx.timesBoldFont });
  ctx.page.drawText("Balance", { x: pColBalance, y: ctx.y - 10, size, font: ctx.timesBoldFont });

  ctx.y -= 14;
  ctx.page.drawLine({
    start: { x: jX(15), y: ctx.y },
    end: { x: jX(195), y: ctx.y },
    thickness: 0.25,
    color: rgb(0, 0, 0),
  });
  ctx.y -= 14;

  for (const p of data.purchases) {
    checkPageBreak(ctx, 20);

    ctx.page.drawText(p.invoiceNumber ?? "—", { x: pColInv, y: ctx.y, size, font: ctx.timesFont });
    ctx.page.drawText(p.editionName, { x: pColEdition, y: ctx.y, size, font: ctx.timesFont });
    ctx.page.drawText(String(p.year), { x: pColYear, y: ctx.y, size, font: ctx.timesFont });
    ctx.page.drawText(fmtCurrency(p.net), { x: pColNet, y: ctx.y, size, font: ctx.timesFont });
    ctx.page.drawText(fmtCurrency(p.amountPaid), { x: pColPaid, y: ctx.y, size, font: ctx.timesFont });

    const balFont = p.balance > 0 ? ctx.timesBoldFont : ctx.timesFont;
    const balColor = p.balance > 0 ? rgb(0.8, 0.1, 0.1) : rgb(0, 0, 0);
    ctx.page.drawText(fmtCurrency(p.balance), {
      x: pColBalance,
      y: ctx.y,
      size,
      font: balFont,
      color: balColor,
    });

    ctx.y -= 14;
    ctx.page.drawLine({
      start: { x: jX(15), y: ctx.y + 4 },
      end: { x: jX(195), y: ctx.y + 4 },
      thickness: 0.25,
      color: rgb(0.85, 0.85, 0.85),
    });
  }

  ctx.y -= 10;

  // 5. Payment History table
  checkPageBreak(ctx, 60);

  const payColDate = jX(15);
  const payColAmount = jX(55);
  const payColMethod = jX(100);
  const payColInv = jX(140);
  const payColEdition = jX(170);

  ctx.page.drawLine({
    start: { x: jX(15), y: ctx.y + 4 },
    end: { x: jX(195), y: ctx.y + 4 },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });

  ctx.page.drawText("Date", { x: payColDate, y: ctx.y - 10, size, font: ctx.timesBoldFont });
  ctx.page.drawText("Amount", { x: payColAmount, y: ctx.y - 10, size, font: ctx.timesBoldFont });
  ctx.page.drawText("Method", { x: payColMethod, y: ctx.y - 10, size, font: ctx.timesBoldFont });
  ctx.page.drawText("Invoice #", { x: payColInv, y: ctx.y - 10, size, font: ctx.timesBoldFont });
  ctx.page.drawText("Edition", { x: payColEdition, y: ctx.y - 10, size, font: ctx.timesBoldFont });

  ctx.y -= 14;
  ctx.page.drawLine({
    start: { x: jX(15), y: ctx.y },
    end: { x: jX(195), y: ctx.y },
    thickness: 0.25,
    color: rgb(0, 0, 0),
  });
  ctx.y -= 14;

  for (const p of data.payments) {
    checkPageBreak(ctx, 20);

    ctx.page.drawText(fmtDate(p.date), { x: payColDate, y: ctx.y, size, font: ctx.timesFont });
    ctx.page.drawText(fmtCurrency(p.amount), { x: payColAmount, y: ctx.y, size, font: ctx.timesFont });
    ctx.page.drawText(p.method?.replace("_", " ") ?? "—", { x: payColMethod, y: ctx.y, size, font: ctx.timesFont });
    ctx.page.drawText(p.invoiceNumber ?? "—", { x: payColInv, y: ctx.y, size, font: ctx.timesFont });
    ctx.page.drawText(`${p.editionName} ${p.year}`, { x: payColEdition, y: ctx.y, size, font: ctx.timesFont });

    ctx.y -= 14;
    ctx.page.drawLine({
      start: { x: jX(15), y: ctx.y + 4 },
      end: { x: jX(195), y: ctx.y + 4 },
      thickness: 0.25,
      color: rgb(0.85, 0.85, 0.85),
    });
  }

  ctx.y -= 10;

  // 6. Overall Balance
  ctx.page.drawLine({
    start: { x: jX(140), y: ctx.y + 4 },
    end: { x: jX(195), y: ctx.y + 4 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  ctx.y -= 14;
  ctx.page.drawText("Overall Balance", {
    x: jX(140),
    y: ctx.y,
    size: 14,
    font: ctx.timesBoldFont,
  });
  const balText = fmtCurrency(data.overallBalance);
  const balTw = ctx.timesBoldFont.widthOfTextAtSize(balText, 14);
  ctx.page.drawText(balText, {
    x: jX(195) - balTw,
    y: ctx.y,
    size: 14,
    font: ctx.timesBoldFont,
  });

  ctx.y -= 20;

  // 7. Footer and tear-off
  drawFooterAndTearoff(ctx, data.orgSettings);

  // 8. Statement message
  if (data.statementMessage) {
    checkPageBreak(ctx, 40);
    ctx.y -= 20;
    ctx.page.drawLine({
      start: { x: leftX, y: ctx.y + 4 },
      end: { x: rightX, y: ctx.y + 4 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    ctx.y -= 14;
    ctx.page.drawText(data.statementMessage, {
      x: leftX,
      y: ctx.y,
      size: 9,
      font: ctx.timesFont,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return await ctx.doc.save();
}
