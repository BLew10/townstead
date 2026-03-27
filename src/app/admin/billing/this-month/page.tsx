"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { DataTable } from "@/components/shared/data-table";
import { thisMonthColumns, type ThisMonthRow } from "./columns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import { BillingBulkEmailMenu } from "@/components/admin/billing-bulk-email-menu";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

export default function ThisMonthPage() {
  const { orgId, isReady } = useOrg();
  const [selectedYear, setSelectedYear] = useState<number | undefined>(
    undefined
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const data = useQuery(
    api.billing.queries.listThisMonth,
    isReady ? { orgId: orgId!, year: selectedYear } : "skip"
  );

  const rows = (data ?? []) as ThisMonthRow[];

  const selectedBulkRows = useMemo(() => {
    return rows.filter((r) => rowSelection[r._id]);
  }, [rows, rowSelection]);

  if (!isReady || data === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const overdueCount = data.filter((r) => r.status === "overdue").length;
  const upcomingCount = data.filter(
    (r) => r.status === "upcoming" || r.status === "partial"
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={selectedYear?.toString() ?? "current"}
            onValueChange={(val) =>
              setSelectedYear(
                !val || val === "current" ? undefined : parseInt(val, 10)
              )
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Current Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Month</SelectItem>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <BillingBulkEmailMenu
            selectedRows={selectedBulkRows.map((r) => ({
              purchaseId: r.purchaseId,
              contactId: r.contactId,
              contactEmail: r.contactEmail,
              displayName: r.company || r.contactName,
              invoiceNumber: r.invoiceNumber,
            }))}
            onComplete={() => setRowSelection({})}
          />
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {overdueCount > 0 && (
            <span className="text-destructive font-medium">
              {overdueCount} overdue
            </span>
          )}
          {upcomingCount > 0 && (
            <span>{upcomingCount} upcoming</span>
          )}
        </div>
      </div>

      <DataTable
        columns={thisMonthColumns}
        data={rows}
        searchKey="contactName"
        searchPlaceholder="Search by contact..."
        emptyTitle="No scheduled payments"
        emptyDescription="No payments due or overdue for the selected period."
        enableRowSelection
        getRowId={(row) => row._id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />
    </div>
  );
}
