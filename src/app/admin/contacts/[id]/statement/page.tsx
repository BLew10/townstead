"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useOrg } from "@/hooks/use-org";
import { useStableNow } from "@/hooks/use-stable-now";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Printer, Download, Mail } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export default function StatementPage() {
  const params = useParams();
  const contactId = params.id as Id<"contacts">;
  const { orgId, isReady } = useOrg();
  const now = useStableNow();
  const [emailSending, setEmailSending] = useState(false);

  const data = useQuery(
    api.billing.queries.getStatementData,
    isReady ? { contactId, orgId: orgId!, now } : "skip"
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
        <Link href="/admin/contacts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Button>
        </Link>
        <EmptyState
          title="Contact not found"
          description="This contact may have been deleted."
        />
      </div>
    );
  }

  const handlePrint = () => window.print();

  const handleDownloadPdf = () => {
    window.open(`/api/pdf/statement/${contactId}`, "_blank");
  };

  const handleEmail = async () => {
    if (!data.contact.email) {
      toast.error("This contact does not have an email address on file.");
      return;
    }
    setEmailSending(true);
    try {
      const res = await fetch("/api/email/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, orgId: orgId! }),
      });
      if (!res.ok) throw new Error("Failed to send email");
      toast.success(`Statement emailed to ${data.contact.email}`);
    } catch {
      toast.error("Could not send the statement email. Please try again.");
    } finally {
      setEmailSending(false);
    }
  };

  const fullName = `${data.contact.firstName} ${data.contact.lastName}`;
  const addressParts = [
    data.contact.address?.street,
    [
      data.contact.address?.city,
      data.contact.address?.state,
      data.contact.address?.zip,
    ]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href={`/admin/contacts/${contactId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contact
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
            {emailSending ? "Sending..." : "Email Statement"}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl rounded-lg border bg-white p-8 shadow-sm print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b">
          <div>
            <h1 className="text-2xl font-bold">STATEMENT</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(Date.now())}
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mb-8">
          <div className="text-sm space-y-0.5">
            {data.contact.company && (
              <p className="font-semibold">{data.contact.company}</p>
            )}
            <p>{fullName}</p>
            {addressParts.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            {data.contact.email && <p>{data.contact.email}</p>}
          </div>
        </div>

        {/* Purchases Table */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Purchases
          </h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Edition</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.purchases.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell className="font-medium">
                      {p.invoiceNumber ?? "—"}
                    </TableCell>
                    <TableCell>{p.editionName}</TableCell>
                    <TableCell>{p.year}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(p.net)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(p.amountPaid)}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.balance > 0 ? (
                        <span className="text-destructive font-medium">
                          {formatCurrency(p.balance)}
                        </span>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Paid
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data.purchases.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-16 text-center text-muted-foreground"
                    >
                      No purchases on record
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Payment History */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Payment History
          </h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Edition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell>{formatDate(p.date)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(p.amount)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {p.method?.replace("_", " ") ?? "—"}
                    </TableCell>
                    <TableCell>{p.invoiceNumber ?? "—"}</TableCell>
                    <TableCell>
                      {p.editionName} {p.year}
                    </TableCell>
                  </TableRow>
                ))}
                {data.payments.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-16 text-center text-muted-foreground"
                    >
                      No payments on record
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Overall Balance */}
        <div className="flex justify-end border-t pt-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Overall Balance
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(data.overallBalance)}
            </p>
          </div>
        </div>

        {/* Statement message */}
        {data.statementMessage && (
          <div className="mt-8 pt-6 border-t text-sm text-muted-foreground whitespace-pre-wrap">
            {data.statementMessage}
          </div>
        )}
      </div>
    </div>
  );
}
