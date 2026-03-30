"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { CreditCard } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function PortalPaymentsPage() {
  const [selectedYear, setSelectedYear] = useState<number | undefined>(
    undefined
  );

  const payments = useQuery(api.portal.queries.getPaymentHistory, {
    year: selectedYear,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
        <Select
          value={selectedYear?.toString() ?? "all"}
          onValueChange={(v) =>
            setSelectedYear(v === "all" ? undefined : parseInt(v))
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {payments === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments"
          description="No payment records found."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Edition</TableHead>
                <TableHead>Year</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell>{formatDate(payment.date)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    {payment.method ? (
                      <Badge
                        className={`capitalize ${
                          {
                            check: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300",
                            credit_card: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300",
                            cash: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300",
                            trade: "bg-violet-100 text-violet-800 hover:bg-violet-100 dark:bg-violet-500/20 dark:text-violet-300",
                            ach: "bg-cyan-100 text-cyan-800 hover:bg-cyan-100 dark:bg-cyan-500/20 dark:text-cyan-300",
                          }[payment.method] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {payment.method.replace("_", " ")}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{payment.invoiceNumber ?? "—"}</TableCell>
                  <TableCell>{payment.editionName}</TableCell>
                  <TableCell>{payment.year}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
