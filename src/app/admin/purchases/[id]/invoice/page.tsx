"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useOrg } from "@/hooks/use-org";
import { useStableNow } from "@/hooks/use-stable-now";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ArrowLeft,
  Printer,
  Download,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export default function InvoicePage() {
  const params = useParams();
  const purchaseId = params.id as Id<"purchases">;
  const { orgId, isReady } = useOrg();
  const now = useStableNow();
  const [emailSending, setEmailSending] = useState(false);

  const data = useQuery(
    api.billing.queries.getInvoiceData,
    isReady ? { purchaseId, orgId: orgId!, now } : "skip"
  );

  if (!isReady || data === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="space-y-6">
        <Link href="/admin/purchases">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchases
          </Button>
        </Link>
        <EmptyState
          title="Invoice not found"
          description="This purchase may have been deleted."
        />
      </div>
    );
  }

  const handlePrint = () => window.print();

  const handleDownloadPdf = () => {
    window.open(`/api/pdf/invoice/${purchaseId}`, "_blank");
  };

  const handleEmail = async () => {
    if (!data.contact?.email) {
      toast.error("This contact does not have an email address on file.");
      return;
    }
    setEmailSending(true);
    try {
      const res = await fetch("/api/email/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId,
          orgId: orgId!,
        }),
      });
      if (!res.ok) throw new Error("Failed to send email");
      toast.success(`Invoice emailed to ${data.contact.email}`);
    } catch {
      toast.error("Could not send the invoice email. Please try again.");
    } finally {
      setEmailSending(false);
    }
  };

  const contactAddress = data.contact?.address;
  const addressLines = [
    contactAddress?.street,
    [contactAddress?.city, contactAddress?.state, contactAddress?.zip]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);

  const nonPrepaidPayments = data.payments?.filter((p) => !p.isPrepaid) ?? [];
  const nonPrepaidAmountPaid = data.amountPaid - (data.prepaidAmount ?? 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href={`/admin/purchases/${purchaseId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchase
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button onClick={handleEmail} disabled={emailSending}>
            <Mail className="mr-2 h-4 w-4" />
            {emailSending ? "Sending..." : "Email Invoice"}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border bg-white p-8 shadow-sm print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b">
          <div>
            <h1 className="text-2xl font-bold">INVOICE</h1>
            <p className="text-muted-foreground mt-1">
              #{data.purchase.invoiceNumber ?? "—"}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">
              {data.editionCodes}
            </p>
            <p>{data.purchase.year}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Bill To
          </h2>
          <div className="text-sm space-y-0.5">
            {data.contact?.company && (
              <p className="font-semibold">{data.contact.company}</p>
            )}
            <p>
              {data.contact?.firstName} {data.contact?.lastName}
            </p>
            {addressLines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            {data.contact?.email && <p>{data.contact.email}</p>}
            {data.contact?.phone && <p>{data.contact.phone}</p>}
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium text-center">Qty</th>
                <th className="pb-2 font-medium text-right">Unit Price</th>
                <th className="pb-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item) => (
                <tr key={item._id} className="border-b">
                  <td className="py-2">
                    <p>{item.advertisementName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.calendarName}
                    </p>
                  </td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-2 text-right">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Subtotals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-1 text-sm">
            {data.terms && (
              <>
                <div className="flex justify-between">
                  <span>Total Sale</span>
                  <span>{formatCurrency(data.terms.totalSale)}</span>
                </div>
                {(data.terms.discount1 ?? 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {data.terms.discount1Label || "Discount 1"}
                    </span>
                    <span>-{formatCurrency(data.terms.discount1!)}</span>
                  </div>
                )}
                {(data.terms.discount2 ?? 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {data.terms.discount2Label || "Discount 2"}
                    </span>
                    <span>-{formatCurrency(data.terms.discount2!)}</span>
                  </div>
                )}
                {(data.terms.additionalSale1 ?? 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {data.terms.additionalSale1Label || "Additional 1"}
                    </span>
                    <span>
                      +{formatCurrency(data.terms.additionalSale1!)}
                    </span>
                  </div>
                )}
                {(data.terms.additionalSale2 ?? 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {data.terms.additionalSale2Label || "Additional 2"}
                    </span>
                    <span>
                      +{formatCurrency(data.terms.additionalSale2!)}
                    </span>
                  </div>
                )}
                {(data.terms.trade ?? 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Trade</span>
                    <span>-{formatCurrency(data.terms.trade!)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 font-semibold text-base">
                  <span>Net Amount</span>
                  <span>{formatCurrency(data.net)}</span>
                </div>
                {(data.prepaidAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground pt-1">
                    <span>Prepaid</span>
                    <span>-{formatCurrency(data.prepaidAmount!)}</span>
                  </div>
                )}
                {nonPrepaidAmountPaid > 0 && (
                  <div className="flex justify-between text-muted-foreground pt-1">
                    <span>Amount Paid</span>
                    <span>-{formatCurrency(nonPrepaidAmountPaid)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 font-semibold text-base">
                  <span>Balance Due</span>
                  <span>{formatCurrency(data.balance)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Terms */}
        {data.terms && (
          <div className="mb-6 text-sm space-y-1 text-muted-foreground">
            {data.terms.dueDayOfMonth && (
              <p>
                Payment due on the {data.terms.dueDayOfMonth}
                {data.terms.dueDayOfMonth === 1
                  ? "st"
                  : data.terms.dueDayOfMonth === 2
                    ? "nd"
                    : data.terms.dueDayOfMonth === 3
                      ? "rd"
                      : "th"}{" "}
                of each month
              </p>
            )}
            {data.terms.earlyDiscountAmount != null &&
              data.terms.earlyDiscountAmount > 0 && (
                <p>
                  Early payment discount:{" "}
                  {data.terms.earlyDiscountType === "percent"
                    ? `${data.terms.earlyDiscountAmount}%`
                    : formatCurrency(data.terms.earlyDiscountAmount)}
                </p>
              )}
            {data.terms.lateFeeAmount != null &&
              data.terms.lateFeeAmount > 0 && (
                <p>
                  Late fee:{" "}
                  {data.terms.lateFeeType === "percent"
                    ? `${data.terms.lateFeeAmount}%`
                    : formatCurrency(data.terms.lateFeeAmount)}{" "}
                  per late payment
                </p>
              )}
          </div>
        )}

        {/* Payment Schedule */}
        {data.scheduledPayments.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Payment Schedule
            </h2>
            <div className="text-sm space-y-1">
              {data.scheduledPayments.map((sp, idx) => {
                const paid = sp.paidAmount >= sp.amount;
                const overdue = sp.isLate && !paid;
                return (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      {formatDate(sp.dueDate)}
                    </span>
                    <div className="flex items-center gap-3">
                      <span>{formatCurrency(sp.amount)}</span>
                      <span
                        className={`text-xs font-medium w-16 text-right ${
                          paid
                            ? "text-green-700"
                            : overdue
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {paid ? "Paid" : overdue ? "Overdue" : "Due"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payments Received */}
        {nonPrepaidPayments.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Payments Received
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium text-right">Method</th>
                </tr>
              </thead>
              <tbody>
                {nonPrepaidPayments.map((payment, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-1.5">{formatDate(payment.date)}</td>
                    <td className="py-1.5 text-right">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="py-1.5 text-right capitalize">
                      {payment.method?.replace("_", " ") ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Custom message */}
        {data.terms?.invoiceMessage && (
          <div className="mt-8 pt-6 border-t text-sm text-muted-foreground whitespace-pre-wrap">
            {data.terms.invoiceMessage}
          </div>
        )}
      </div>
    </div>
  );
}
