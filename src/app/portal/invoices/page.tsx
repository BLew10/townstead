"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { FileText, Download, Eye, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useStableNow } from "@/hooks/use-stable-now";

export default function PortalInvoicesPage() {
  const now = useStableNow();
  const invoices = useQuery(api.portal.queries.getInvoices, { now });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Invoices & Statements
      </h1>

      {invoices === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices"
          description="No invoice records found."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Edition</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice._id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber ?? "—"}
                  </TableCell>
                  <TableCell>{invoice.editionName}</TableCell>
                  <TableCell>{invoice.year}</TableCell>
                  <TableCell>{formatCurrency(invoice.net)}</TableCell>
                  <TableCell>{formatCurrency(invoice.amountPaid)}</TableCell>
                  <TableCell>
                    {invoice.isPaid ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-500/20 dark:text-green-300 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Paid
                      </Badge>
                    ) : invoice.amountPaid > 0 ? (
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-500/20 dark:text-yellow-300 gap-1">
                        <Clock className="h-3 w-3" />
                        Partial
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Unpaid
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        render={
                          <Link
                            href={`/admin/purchases/${invoice._id}/invoice`}
                            target="_blank"
                          />
                        }
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        render={
                          <a
                            href={`/api/pdf/invoice/${invoice._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        <Download className="mr-1 h-3.5 w-3.5" />
                        PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
