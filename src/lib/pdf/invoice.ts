import {
  createPdfContext,
  drawBusinessHeader,
  drawSponsorBlock,
  drawFooterAndTearoff,
  drawWrappedText,
  fmtCurrency,
  fmtDateShort,
  rgb,
  type OrgSettingsPdf,
  type SponsorContact,
} from "./shared";

interface InvoiceLineItem {
  advertisementName: string;
  calendarName: string;
  quantity: number;
  total: number;
}

interface InvoiceScheduledPayment {
  dueDate: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  editionName: string;
  year: number;
  createdAt?: number;
  contact: SponsorContact;
  orgSettings: OrgSettingsPdf;
  terms: {
    totalSale: number;
    discount1?: number;
    discount1Label?: string;
    discount2?: number;
    discount2Label?: string;
    additionalSale1?: number;
    additionalSale1Label?: string;
    additionalSale2?: number;
    additionalSale2Label?: string;
    trade?: number;
    earlyDiscountType?: string;
    earlyDiscountAmount?: number;
    dueDayOfMonth?: number;
    lateFeeType?: string;
    lateFeeAmount?: number;
    invoiceMessage?: string;
  } | null;
  lineItems: InvoiceLineItem[];
  net: number;
  scheduledPayments: InvoiceScheduledPayment[];
  prepaidAmount?: number;
}

function groupByEdition(items: InvoiceLineItem[]) {
  const groups: Map<string, InvoiceLineItem[]> = new Map();
  for (const item of items) {
    const key = item.calendarName || "Unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

function generatePayPlan(payments: InvoiceScheduledPayment[]): string {
  if (payments.length === 0) return "";
  let plan = "PAY PLAN: ";
  for (let i = 0; i < payments.length; i++) {
    const p = payments[i];
    const amount = fmtCurrency(p.amount);
    const date = fmtDateShort(p.dueDate);
    if (i === 0) {
      plan += `${amount} due on ${date}`;
    } else if (i === payments.length - 1) {
      plan += `, and ${amount} due on ${date}.`;
    } else {
      plan += `, ${amount} due on ${date}`;
    }
  }
  if (!plan.endsWith(".")) plan += ".";
  return plan;
}

export async function generateInvoicePdf(
  data: InvoiceData
): Promise<Uint8Array> {
  const ctx = await createPdfContext();

  // V1-style coordinate helpers (jsPDF mm -> pdf-lib points)
  const jX = (mmX: number) => mmX * (612 / 210);
  const jY = (mmY: number) => ctx.height - mmY * (ctx.height / 297);

  const LEFT = 10;
  const RIGHT = 200;
  const leftX = jX(LEFT);
  const rightX = jX(RIGHT);
  const size = 10;

  // 1. Business header
  drawBusinessHeader(ctx, data.orgSettings);

  // 2. Sponsor block with publisher, year, date, invoice number
  const afterSponsorY = drawSponsorBlock(ctx, data.orgSettings, data.contact, {
    year: data.year,
    createdAt: data.createdAt,
    invoiceNumber: data.invoiceNumber,
  });

  // 3. Line items table header
  let currentMm = 100;
  let tableY = jY(currentMm);

  ctx.page.drawText("Editions", {
    x: jX(20),
    y: tableY,
    size,
    font: ctx.timesBoldFont,
  });
  ctx.page.drawText("Description", {
    x: jX(70),
    y: tableY,
    size,
    font: ctx.timesBoldFont,
  });
  ctx.page.drawText("Total", {
    x: jX(170),
    y: tableY,
    size,
    font: ctx.timesBoldFont,
  });

  currentMm += 3;
  tableY = jY(currentMm);
  ctx.page.drawLine({
    start: { x: jX(15), y: tableY },
    end: { x: jX(195), y: tableY },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });

  currentMm += 5;
  ctx.y = jY(currentMm);

  // 4. Line items grouped by edition
  const groups = groupByEdition(data.lineItems);
  const processedEditions = new Set<string>();

  for (const [editionName, items] of groups) {
    for (const item of items) {
      if (ctx.y < 120) {
        ctx.page = ctx.doc.addPage([ctx.width, ctx.height]);
        ctx.y = ctx.height - 50;
      }

      const showEdition = !processedEditions.has(editionName);
      if (showEdition) processedEditions.add(editionName);

      ctx.page.drawText(showEdition ? editionName : "", {
        x: jX(15),
        y: ctx.y,
        size,
        font: ctx.timesFont,
      });

      ctx.page.drawText(`${item.quantity} ${item.advertisementName}`, {
        x: jX(65),
        y: ctx.y,
        size,
        font: ctx.timesFont,
      });

      const totalText = `$${(item.total / 100).toFixed(2)}`;
      const tw = ctx.timesFont.widthOfTextAtSize(totalText, size);
      ctx.page.drawText(totalText, {
        x: jX(190) - tw,
        y: ctx.y,
        size,
        font: ctx.timesFont,
      });

      ctx.y -= 14;
    }
  }

  // Separator
  ctx.y -= 4;
  const sepText = "-------";
  const sepTw = ctx.timesFont.widthOfTextAtSize(sepText, size);
  ctx.page.drawText(sepText, {
    x: jX(190) - sepTw,
    y: ctx.y,
    size,
    font: ctx.timesFont,
  });
  ctx.y -= 14;

  // 5. Subtotals
  const drawSubtotalLine = (
    label: string,
    amount: string,
    bold = false
  ) => {
    const f = bold ? ctx.timesBoldFont : ctx.timesFont;
    ctx.page.drawText(label, {
      x: jX(65),
      y: ctx.y,
      size,
      font: f,
    });
    const tw = f.widthOfTextAtSize(amount, size);
    ctx.page.drawText(amount, {
      x: jX(190) - tw,
      y: ctx.y,
      size,
      font: f,
    });
    ctx.y -= 14;
  };

  if (data.terms) {
    drawSubtotalLine("Total", `$${(data.terms.totalSale / 100).toFixed(2)}`);

    if ((data.terms.discount1 ?? 0) > 0) {
      drawSubtotalLine(
        data.terms.discount1Label || "Additional Discount 1",
        `-$${(data.terms.discount1! / 100).toFixed(2)}`
      );
    }
    if ((data.terms.discount2 ?? 0) > 0) {
      drawSubtotalLine(
        data.terms.discount2Label || "Additional Discount 2",
        `-$${(data.terms.discount2! / 100).toFixed(2)}`
      );
    }
    if ((data.terms.additionalSale1 ?? 0) > 0) {
      drawSubtotalLine(
        data.terms.additionalSale1Label || "Additional Sales 1",
        `+$${(data.terms.additionalSale1! / 100).toFixed(2)}`
      );
    }
    if ((data.terms.additionalSale2 ?? 0) > 0) {
      drawSubtotalLine(
        data.terms.additionalSale2Label || "Additional Sales 2",
        `+$${(data.terms.additionalSale2! / 100).toFixed(2)}`
      );
    }

    if (data.terms.earlyDiscountAmount && data.terms.earlyDiscountAmount > 0) {
      let discountVal: number;
      if (data.terms.earlyDiscountType === "percent") {
        discountVal = Math.round(
          (data.terms.earlyDiscountAmount / 100) * data.terms.totalSale
        );
      } else {
        discountVal = data.terms.earlyDiscountAmount;
      }
      drawSubtotalLine(
        "Early Payment Discount",
        `-$${(discountVal / 100).toFixed(2)}`
      );
    }

    if ((data.terms.trade ?? 0) > 0) {
      drawSubtotalLine("Trade", `-$${(data.terms.trade! / 100).toFixed(2)}`);
    }
  }

  drawSubtotalLine(
    "TOTAL AMOUNT OF PURCHASE",
    `$${(data.net / 100).toFixed(2)}`,
    false
  );

  if (data.prepaidAmount && data.prepaidAmount > 0) {
    drawSubtotalLine("Prepaid", `-$${(data.prepaidAmount / 100).toFixed(2)}`);
  }

  // 6. PAY PLAN
  if (data.scheduledPayments.length > 0) {
    ctx.y -= 6;
    if (ctx.y < 200) {
      ctx.page = ctx.doc.addPage([ctx.width, ctx.height]);
      ctx.y = ctx.height - 50;
    }
    const payPlan = generatePayPlan(data.scheduledPayments);
    drawWrappedText(ctx, payPlan, leftX, rightX - leftX, {
      size,
      bold: true,
      times: true,
      lineSpacing: 12,
    });
  }

  // 7. Footer and tear-off
  const firstPaymentDate =
    data.scheduledPayments.length > 0
      ? fmtDateShort(data.scheduledPayments[0].dueDate)
      : undefined;

  drawFooterAndTearoff(ctx, data.orgSettings, {
    dueDayOfMonth: data.terms?.dueDayOfMonth,
    lateFeeAmount: data.terms?.lateFeeAmount,
    lateFeeType: data.terms?.lateFeeType,
    firstPaymentDate,
  });

  return await ctx.doc.save();
}
