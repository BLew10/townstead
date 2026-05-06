"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useOrg } from "@/hooks/use-org";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useDefaultYear } from "@/hooks/use-default-year";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 12 }, (_, i) => currentYear + 2 - i);

const ALL_EDITIONS = "all";
const ALL_PAYMENT_YEARS = "all";

function formatColumnKey(key: string): string {
  const [yearStr, monthStr] = key.split("-");
  const monthIdx = parseInt(monthStr, 10) - 1;
  return `${MONTH_NAMES[monthIdx]} ${yearStr}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type CellStatus = "paid" | "partial" | "overdue" | "pending" | "none";

function getCellStatus(
  projected: number,
  actual: number,
  columnKey: string
): CellStatus {
  if (projected === 0 && actual === 0) return "none";
  if (actual >= projected && projected > 0) return "paid";
  if (actual > 0 && projected === 0) return "paid";
  if (actual > 0) return "partial";

  const [yearStr, monthStr] = columnKey.split("-");
  const dueDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0);
  if (new Date() > dueDate) return "overdue";
  return "pending";
}

const cellStyles: Record<CellStatus, string> = {
  paid: "bg-green-50 text-green-900",
  partial: "bg-yellow-50 text-yellow-900",
  overdue: "bg-red-50 text-red-900",
  pending: "bg-blue-50 text-blue-900",
  none: "bg-muted/30 text-muted-foreground",
};

type SelectedContact = {
  contactId: string;
  contactName: string;
  company: string;
  purchases: {
    purchaseId: string;
    editionNames: string[];
    invoiceNumber: string | undefined;
  }[];
};

function PurchaseScheduleSection({ purchaseId, now }: { purchaseId: string; now: number }) {
  const schedule = useQuery(
    api.scheduledPayments.queries.listByPurchase,
    { purchaseId: purchaseId as Id<"purchases">, now }
  );

  const payments = useQuery(
    api.payments.queries.listByPurchase,
    { purchaseId: purchaseId as Id<"purchases"> }
  );

  if (schedule === undefined || payments === undefined) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-1.5 text-left text-xs font-medium">Due Date</th>
              <th className="px-3 py-1.5 text-right text-xs font-medium">Amount Owed</th>
              <th className="px-3 py-1.5 text-right text-xs font-medium">Paid</th>
              <th className="px-3 py-1.5 text-right text-xs font-medium">Balance</th>
              <th className="px-3 py-1.5 text-center text-xs font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-muted-foreground text-xs">
                  No scheduled payments
                </td>
              </tr>
            ) : (
              schedule.map((sp) => {
                const balance = Math.max(0, sp.amount - sp.paidAmount);
                const isPaid = sp.paidAmount >= sp.amount;
                return (
                  <tr key={sp._id} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5 text-xs">{formatDate(sp.dueDate)}</td>
                    <td className="px-3 py-1.5 text-xs text-right">{formatCurrency(sp.amount)}</td>
                    <td className="px-3 py-1.5 text-xs text-right">{formatCurrency(sp.paidAmount)}</td>
                    <td className="px-3 py-1.5 text-xs text-right">{formatCurrency(balance)}</td>
                    <td className="px-3 py-1.5 text-xs text-center">
                      {isPaid ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                          Paid
                        </Badge>
                      ) : sp.isLate ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                          Overdue
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px]">
                          Pending
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {payments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Payment History</p>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-1.5 text-left text-xs font-medium">Payment Date</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium">Method</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium">Check #</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5 text-xs">{formatDate(p.date)}</td>
                    <td className="px-3 py-1.5 text-xs capitalize">{p.method ?? "—"}</td>
                    <td className="px-3 py-1.5 text-xs">{p.checkNumber ?? "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-right">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CashFlowPage() {
  const { orgId, isReady } = useOrg();
  const { defaultYear, setDefaultYear } = useDefaultYear();
  const [selectedEditionYear, setSelectedEditionYear] = useState(defaultYear);
  const [selectedPaymentYear, setSelectedPaymentYear] = useState<string>(ALL_PAYMENT_YEARS);
  const [selectedEditionId, setSelectedEditionId] = useState<string>(ALL_EDITIONS);
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null);

  const now = useMemo(() => Date.now(), []);

  const editions = useQuery(
    api.calendarEditions.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );

  const paymentYearNum = selectedPaymentYear !== ALL_PAYMENT_YEARS
    ? parseInt(selectedPaymentYear, 10)
    : undefined;

  const report = useQuery(
    api.billing.queries.getCashFlowReport,
    isReady
      ? {
          orgId: orgId!,
          ...(selectedEditionId !== ALL_EDITIONS && {
            calendarEditionId: selectedEditionId as Id<"calendarEditions">,
          }),
          year: selectedEditionYear,
          ...(paymentYearNum !== undefined && { paymentYear: paymentYearNum }),
        }
      : "skip"
  );

  if (!isReady || editions === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const handleExportPdf = async () => {
    const params = new URLSearchParams({
      year: selectedEditionYear.toString(),
    });
    if (paymentYearNum !== undefined) {
      params.set("paymentYear", paymentYearNum.toString());
    }
    if (selectedEditionId !== ALL_EDITIONS) {
      params.set("editionId", selectedEditionId);
    }
    window.open(`/api/pdf/cash-flow?${params}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={selectedEditionId}
            onValueChange={(val) =>
              setSelectedEditionId(val ?? ALL_EDITIONS)
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Editions">
                {selectedEditionId === ALL_EDITIONS
                  ? "All Editions"
                  : editions.find((ed) => ed._id === selectedEditionId)?.name ??
                    "All Editions"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_EDITIONS}>All Editions</SelectItem>
              {editions.map((ed) => (
                <SelectItem key={ed._id} value={ed._id}>
                  {ed.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedEditionYear.toString()}
            onValueChange={(val) => {
              if (val) {
                const year = parseInt(val, 10);
                setSelectedEditionYear(year);
                setSelectedPaymentYear(ALL_PAYMENT_YEARS);
                setDefaultYear(year);
              }
            }}
          >
            <SelectTrigger className="w-40">
              <span className="text-muted-foreground text-xs mr-1">Edition Year</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedPaymentYear}
            onValueChange={(val) => {
              if (val) setSelectedPaymentYear(val);
            }}
          >
            <SelectTrigger className="w-44">
              <span className="text-muted-foreground text-xs mr-1">Payment Year</span>
              <SelectValue>
                {selectedPaymentYear === ALL_PAYMENT_YEARS
                  ? "All"
                  : selectedPaymentYear}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PAYMENT_YEARS}>All</SelectItem>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={handleExportPdf}>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {report === undefined ? (
        <Skeleton className="h-96 w-full" />
      ) : report.rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No payment activity found for these filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left font-medium min-w-[180px] z-20">
                  Contact
                </th>
                {report.columns.map((col) => (
                  <th key={col} className="px-2 py-2 text-center font-medium min-w-[100px] whitespace-nowrap">
                    {formatColumnKey(col)}
                  </th>
                ))}
                <th className="sticky right-0 bg-muted/50 px-3 py-2 text-center font-medium min-w-[120px] border-l z-20 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr
                  key={row.contactId}
                  className="border-b cursor-pointer hover:bg-primary/5 transition-colors group"
                  onClick={() =>
                    setSelectedContact({
                      contactId: row.contactId,
                      contactName: row.contactName,
                      company: row.company,
                      purchases: row.purchases,
                    })
                  }
                >
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium z-10 group-hover:bg-primary/5 transition-colors">
                    <div>
                      <p className="text-primary/90 underline-offset-2 group-hover:underline">
                        {row.company || row.contactName}
                      </p>
                      {row.company && (
                        <p className="text-xs text-muted-foreground">
                          {row.contactName}
                        </p>
                      )}
                    </div>
                  </td>
                  {row.cells.map((cell, idx) => {
                    const status = getCellStatus(
                      cell.projected,
                      cell.actual,
                      report.columns[idx]
                    );
                    return (
                      <td
                        key={report.columns[idx]}
                        className={cn(
                          "px-2 py-2 text-center",
                          cellStyles[status]
                        )}
                      >
                        {cell.projected > 0 || cell.actual > 0 ? (
                          <div>
                            <p className="text-xs opacity-60">
                              {formatCurrency(cell.projected)}
                            </p>
                            <p className="font-medium">
                              {formatCurrency(cell.actual)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 bg-background px-3 py-2 text-center border-l z-10 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] group-hover:bg-primary/5 transition-colors">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(row.total.projected)}
                      </p>
                      <p className="font-medium">
                        {formatCurrency(row.total.actual)}
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-medium border-t-2">
                <td className="sticky left-0 bg-muted/50 px-3 py-2 z-20">
                  Totals
                </td>
                {report.summary.cells.map((cell, idx) => (
                  <td key={report.columns[idx]} className="px-2 py-2 text-center">
                    <div>
                      <p className="text-xs opacity-60">
                        {formatCurrency(cell.projected)}
                      </p>
                      <p>{formatCurrency(cell.actual)}</p>
                    </div>
                  </td>
                ))}
                <td className="sticky right-0 bg-muted/50 px-3 py-2 text-center border-l z-20 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                  <div>
                    <p className="text-xs opacity-60">
                      {formatCurrency(report.summary.total.projected)}
                    </p>
                    <p>{formatCurrency(report.summary.total.actual)}</p>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Dialog
        open={selectedContact !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedContact(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedContact?.company || selectedContact?.contactName}
            </DialogTitle>
            <DialogDescription>
              Payment schedule for Edition Year {selectedEditionYear}
            </DialogDescription>
          </DialogHeader>

          {selectedContact && (
            <div className="space-y-6">
              {selectedContact.purchases.map((purchase) => (
                <div key={purchase.purchaseId} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {purchase.editionNames.join(", ") || "No edition"}
                    </p>
                    {purchase.invoiceNumber && (
                      <Badge variant="secondary" className="text-[10px]">
                        Inv #{purchase.invoiceNumber}
                      </Badge>
                    )}
                  </div>
                  <PurchaseScheduleSection purchaseId={purchase.purchaseId} now={now} />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
