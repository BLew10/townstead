import { getResend, EMAIL_FROM } from "./resend";
import { getConvexClient } from "@/lib/convex-server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { generateInvoicePdf } from "@/lib/pdf/invoice";
import { InvoiceEmail } from "@/emails/invoice-email";
import { render } from "@react-email/components";

export async function sendInvoiceEmail(
  purchaseId: Id<"purchases">,
  orgId: string
) {
  const convex = getConvexClient();

  const [data, settings] = await Promise.all([
    convex.query(api.billing.queries.getInvoiceData, {
      purchaseId,
      orgId,
      now: Date.now(),
    }),
    convex.query(api.settings.queries.getOrgSettings, { orgId }),
  ]);

  if (!data) throw new Error("Invoice data not found");
  if (!data.contact?.email) throw new Error("Contact has no email address");

  const orgSettings = settings ?? {
    businessName: "Your Business",
    orgId,
  };

  const prepaidPayment = data.payments.find((p) => p.isPrepaid);

  const pdfBytes = await generateInvoicePdf({
    invoiceNumber: data.purchase.invoiceNumber ?? "DRAFT",
    editionName: data.edition?.name ?? "",
    year: data.purchase.year,
    createdAt: data.purchase._creationTime,
    contact: {
      company: data.contact.company ?? undefined,
      firstName: data.contact.firstName,
      lastName: data.contact.lastName,
      email: data.contact.email ?? undefined,
      phone: data.contact.phone ?? undefined,
      address: data.contact.address ?? undefined,
    },
    orgSettings,
    terms: data.terms
      ? {
          totalSale: data.terms.totalSale,
          discount1: data.terms.discount1 ?? undefined,
          discount1Label: data.terms.discount1Label ?? undefined,
          discount2: data.terms.discount2 ?? undefined,
          discount2Label: data.terms.discount2Label ?? undefined,
          additionalSale1: data.terms.additionalSale1 ?? undefined,
          additionalSale1Label: data.terms.additionalSale1Label ?? undefined,
          additionalSale2: data.terms.additionalSale2 ?? undefined,
          additionalSale2Label: data.terms.additionalSale2Label ?? undefined,
          trade: data.terms.trade ?? undefined,
          dueDayOfMonth: data.terms.dueDayOfMonth ?? undefined,
          earlyDiscountType: data.terms.earlyDiscountType ?? undefined,
          earlyDiscountAmount: data.terms.earlyDiscountAmount ?? undefined,
          lateFeeType: data.terms.lateFeeType ?? undefined,
          lateFeeAmount: data.terms.lateFeeAmount ?? undefined,
          invoiceMessage: data.terms.invoiceMessage ?? undefined,
        }
      : null,
    lineItems: data.lineItems.map((li) => ({
      advertisementName: li.advertisementName,
      calendarName: li.calendarName,
      quantity: li.quantity,
      total: li.total,
    })),
    net: data.net,
    scheduledPayments: data.scheduledPayments.map((sp) => ({
      dueDate: sp.dueDate,
      amount: sp.amount,
    })),
    prepaidAmount: prepaidPayment?.amount,
  });

  const contactName = `${data.contact.firstName} ${data.contact.lastName}`;
  const invoiceNum = data.purchase.invoiceNumber ?? "DRAFT";

  const html = await render(
    InvoiceEmail({
      contactName,
      invoiceNumber: invoiceNum,
      editionName: data.edition?.name ?? "",
      year: data.purchase.year,
      netAmount: data.net,
    })
  );

  const resend = getResend();
  await resend.emails.send({
    from: EMAIL_FROM,
    to: data.contact.email,
    subject: `Invoice #${invoiceNum} — ${data.edition?.name ?? ""} ${data.purchase.year}`,
    html,
    attachments: [
      {
        filename: `invoice-${invoiceNum}.pdf`,
        content: Buffer.from(pdfBytes).toString("base64"),
      },
    ],
  });
}
