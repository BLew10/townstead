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
import { Download } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { useState } from "react";
import { useDefaultYear } from "@/hooks/use-default-year";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 12 }, (_, i) => currentYear + 2 - i);

type CellStatus = "paid" | "partial" | "overdue" | "none";

function getCellStatus(
  projected: number,
  actual: number,
  monthIdx: number,
  year: number
): CellStatus {
  if (projected === 0) return "none";
  if (actual >= projected) return "paid";
  if (actual > 0) return "partial";

  const now = new Date();
  const dueDate = new Date(year, monthIdx + 1, 0);
  if (now > dueDate) return "overdue";
  return "partial";
}

const cellStyles: Record<CellStatus, string> = {
  paid: "bg-green-50 text-green-900",
  partial: "bg-yellow-50 text-yellow-900",
  overdue: "bg-red-50 text-red-900",
  none: "bg-muted/30 text-muted-foreground",
};

export default function CashFlowPage() {
  const { orgId, isReady } = useOrg();
  const { defaultYear, setDefaultYear } = useDefaultYear();
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedEditionId, setSelectedEditionId] = useState<string>("");

  const editions = useQuery(
    api.calendarEditions.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );

  const editionId = selectedEditionId || editions?.[0]?._id;

  const report = useQuery(
    api.billing.queries.getCashFlowReport,
    isReady && editionId
      ? {
          orgId: orgId!,
          calendarEditionId: editionId as Id<"calendarEditions">,
          year: selectedYear,
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

  if (editions.length === 0) {
    return (
      <EmptyState
        title="No calendar editions"
        description="Create a calendar edition to view cash flow reports."
      />
    );
  }

  const handleExportPdf = async () => {
    if (!editionId) return;
    const params = new URLSearchParams({
      editionId,
      year: selectedYear.toString(),
    });
    window.open(`/api/pdf/cash-flow?${params}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={editionId ?? ""}
            onValueChange={(val) => setSelectedEditionId(val ?? "")}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select edition...">
                {editions.find((ed) => ed._id === editionId)?.name ??
                  "Select edition..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {editions.map((ed) => (
                <SelectItem key={ed._id} value={ed._id}>
                  {ed.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedYear.toString()}
            onValueChange={(val) => {
              if (val) {
                const year = parseInt(val, 10);
                setSelectedYear(year);
                setDefaultYear(year);
              }
            }}
          >
            <SelectTrigger className="w-28">
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
          No purchases found for this edition and year.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left font-medium min-w-[180px]">
                  Contact
                </th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-2 py-2 text-center font-medium min-w-[100px]">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium min-w-[120px] border-l">
                  Year Total
                </th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.contactId} className="border-b">
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium">
                    <div>
                      <p>{row.company || row.contactName}</p>
                      {row.company && (
                        <p className="text-xs text-muted-foreground">
                          {row.contactName}
                        </p>
                      )}
                    </div>
                  </td>
                  {row.months.map((cell, idx) => {
                    const status = getCellStatus(
                      cell.projected,
                      cell.actual,
                      idx,
                      selectedYear
                    );
                    return (
                      <td
                        key={idx}
                        className={cn(
                          "px-2 py-2 text-center",
                          cellStyles[status]
                        )}
                      >
                        {cell.projected > 0 ? (
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
                  <td className="px-3 py-2 text-center border-l">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(row.yearTotal.projected)}
                      </p>
                      <p className="font-medium">
                        {formatCurrency(row.yearTotal.actual)}
                      </p>
                    </div>
                  </td>
                </tr>
              ))}

              <tr className="bg-muted/50 font-medium border-t-2">
                <td className="sticky left-0 bg-muted/50 px-3 py-2">
                  Totals
                </td>
                {report.summary.months.map((cell, idx) => (
                  <td key={idx} className="px-2 py-2 text-center">
                    <div>
                      <p className="text-xs opacity-60">
                        {formatCurrency(cell.projected)}
                      </p>
                      <p>{formatCurrency(cell.actual)}</p>
                    </div>
                  </td>
                ))}
                <td className="px-3 py-2 text-center border-l">
                  <div>
                    <p className="text-xs opacity-60">
                      {formatCurrency(report.summary.yearTotal.projected)}
                    </p>
                    <p>{formatCurrency(report.summary.yearTotal.actual)}</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
