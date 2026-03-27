"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { DataTable } from "@/components/shared/data-table";
import { paymentColumns, type PaymentRow } from "./columns";
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

export default function PaymentsPage() {
  const { orgId, isReady } = useOrg();
  const [selectedYear, setSelectedYear] = useState<number | undefined>(
    undefined
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const payments = useQuery(
    api.billing.queries.listPayments,
    isReady ? { orgId: orgId!, year: selectedYear } : "skip"
  );

  const rows = (payments ?? []) as PaymentRow[];

  const selectedBulkRows = useMemo(() => {
    return rows.filter((r) => rowSelection[r._id]);
  }, [rows, rowSelection]);

  if (!isReady || payments === undefined) {
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
          onValueChange={(val) =>
            setSelectedYear(!val || val === "all" ? undefined : parseInt(val, 10))
          }
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
        columns={paymentColumns}
        data={rows}
        searchKey="contactName"
        searchPlaceholder="Search by contact..."
        emptyTitle="No payments found"
        emptyDescription="No payment records match the current filters."
        enableRowSelection
        getRowId={(row) => row._id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />
    </div>
  );
}
