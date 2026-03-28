"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { PageHeader } from "@/components/shared/page-header";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DataTable } from "@/components/shared/data-table";
import { paymentColumns, type PaymentRow } from "./columns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useDefaultYear } from "@/hooks/use-default-year";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 12 }, (_, i) => currentYear + 2 - i);

export default function PaymentsPage() {
  const { orgId, isReady } = useOrg();
  const { defaultYear, setDefaultYear } = useDefaultYear();
  const [selectedYear, setSelectedYear] = useState<number | undefined>(
    defaultYear
  );

  const payments = useQuery(
    api.billing.queries.listPayments,
    isReady ? { orgId: orgId!, year: selectedYear } : "skip"
  );

  const rows = (payments ?? []) as PaymentRow[];

  if (!isReady || payments === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payments" />
        <TableSkeleton columns={6} rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="View all recorded payments"
      />
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
      </div>
      <DataTable
        columns={paymentColumns}
        data={rows}
        searchKey="contactName"
        searchPlaceholder="Search by contact..."
        emptyTitle="No payments found"
        emptyDescription="No payment records match the current filters."
      />
    </div>
  );
}
