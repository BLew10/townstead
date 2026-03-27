"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { PageHeader } from "@/components/shared/page-header";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { columns } from "./columns";
import { CouponForm } from "./coupon-form";
import type { Doc } from "../../../../convex/_generated/dataModel";

export default function CouponsPage() {
  const { orgId, isReady } = useOrg();
  const coupons = useQuery(
    api.coupons.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const contacts = useQuery(
    api.contacts.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const communities = useQuery(
    api.communities.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"coupons"> | null>(null);

  if (!isReady || coupons === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Coupons" />
        <TableSkeleton columns={5} rows={10} />
      </div>
    );
  }

  const handleEdit = (coupon: Doc<"coupons">) => {
    setEditing(coupon);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        description="Manage coupons and special offers"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Coupon
          </Button>
        }
      />
      <DataTable
        columns={columns({
          onEdit: handleEdit,
          contacts: contacts ?? [],
        })}
        data={coupons}
        searchKey="title"
        searchPlaceholder="Search coupons..."
        emptyTitle="No coupons"
        emptyDescription="Get started by adding your first coupon."
      />
      <CouponForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        contacts={contacts ?? []}
        communities={communities ?? []}
      />
    </div>
  );
}
