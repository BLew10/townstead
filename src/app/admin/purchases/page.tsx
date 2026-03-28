"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { useStableNow } from "@/hooks/use-stable-now";
import { PageHeader } from "@/components/shared/page-header";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { purchaseColumns } from "./columns";

export default function PurchasesPage() {
  const { orgId, isReady } = useOrg();
  const now = useStableNow();
  const router = useRouter();
  const purchases = useQuery(
    api.purchases.queries.list,
    isReady ? { orgId: orgId!, now } : "skip"
  );

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
          <Button onClick={() => router.push("/admin/purchases/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
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
      />
    </div>
  );
}
