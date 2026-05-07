"use client";

import { useMemo, useState } from "react";
import { useQuery, useConvex } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { useStableNow } from "@/hooks/use-stable-now";
import { useDefaultYear } from "@/hooks/use-default-year";
import { PageHeader } from "@/components/shared/page-header";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { purchaseColumns } from "./columns";
import { downloadCsv, downloadXlsx } from "@/lib/export/spreadsheet";
import { contactExportColumns } from "@/lib/export/columns/contacts";

export default function PurchasesPage() {
  const { orgId, isReady } = useOrg();
  const now = useStableNow();
  const { defaultYear } = useDefaultYear();
  const router = useRouter();
  const convex = useConvex();
  const [isDownloading, setIsDownloading] = useState(false);
  const purchases = useQuery(
    api.purchases.queries.list,
    isReady ? { orgId: orgId!, now } : "skip"
  );

  const handleDownload = async (format: "csv" | "xlsx") => {
    if (!orgId) return;
    setIsDownloading(true);
    try {
      const contacts = await convex.query(api.purchases.queries.exportContacts, {
        orgId,
        year: defaultYear,
      });
      const filename = `purchase-contacts-${defaultYear}.${format}`;
      if (format === "xlsx") {
        downloadXlsx(contacts, contactExportColumns, "Contacts", filename);
      } else {
        downloadCsv(contacts, contactExportColumns, filename);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const columns = useMemo(() => {
    const years = [
      ...new Set((purchases ?? []).map((p) => p.year)),
    ].sort((a, b) => b - a);

    return purchaseColumns({
      yearOptions: years.map((y) => ({ label: String(y), value: String(y) })),
    });
  }, [purchases]);

  if (!isReady || purchases === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Purchases" />
        <TableSkeleton columns={7} rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        description="Manage ad sales and purchase records"
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isDownloading}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Contacts
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload("xlsx")}>
                  Download {defaultYear} contacts as XLSX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("csv")}>
                  Download {defaultYear} contacts as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => router.push("/admin/purchases/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Purchase
            </Button>
          </div>
        }
      />
      <DataTable
        columns={columns}
        data={purchases}
        searchKey="contactName"
        searchPlaceholder="Search by contact..."
        emptyTitle="No purchases"
        emptyDescription="Get started by creating your first purchase."
        onRowClick={(row) => router.push(`/admin/purchases/${row._id}`)}
        noPagination
        initialSorting={[{ id: "contactName", desc: false }]}
        initialColumnFilters={[{ id: "year", value: [String(defaultYear)] }]}
      />
    </div>
  );
}
