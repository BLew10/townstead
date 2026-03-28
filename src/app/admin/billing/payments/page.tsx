"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { useStableNow } from "@/hooks/use-stable-now";
import { DataTable } from "@/components/shared/data-table";
import { owedPaymentColumns, type OwedPaymentRow } from "./columns";
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
import { useDefaultYear } from "@/hooks/use-default-year";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 12 }, (_, i) => currentYear + 2 - i);

export default function BillingPaymentsPage() {
  const { orgId, isReady } = useOrg();
  const now = useStableNow();
  const { defaultYear, setDefaultYear } = useDefaultYear();
  const [selectedYear, setSelectedYear] = useState<number | undefined>(
    defaultYear
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const owedPayments = useQuery(
    api.billing.queries.listOwedPayments,
    isReady ? { orgId: orgId!, year: selectedYear, now } : "skip"
  );

  const rows = (owedPayments ?? []) as OwedPaymentRow[];

  const selectedBulkRows = useMemo(() => {
    return rows.filter((r) => rowSelection[r._id]);
  }, [rows, rowSelection]);

  if (!isReady || owedPayments === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={selectedYear?.toString() ?? "all"}
          onValueChange={(val) => {
            const year = !val || val === "all" ? undefined : parseInt(val, 10);
            setSelectedYear(year);
            if (year) setDefaultYear(year);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
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

      <DataTable
        columns={owedPaymentColumns}
        data={rows}
        searchKey="contactName"
        searchPlaceholder="Search by contact..."
        emptyTitle="No owed payments"
        emptyDescription="All purchases are fully paid."
        enableRowSelection
        getRowId={(row) => row._id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        noPagination
        initialSorting={[{ id: "contactName", desc: false }]}
      />
    </div>
  );
}
