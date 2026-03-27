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
import { LayoutForm } from "./layout-form";
import type { Doc } from "../../../../convex/_generated/dataModel";

export default function LayoutsPage() {
  const { orgId, isReady } = useOrg();
  const layouts = useQuery(
    api.layouts.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"layouts"> | null>(null);

  if (!isReady || layouts === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Layouts" />
        <TableSkeleton columns={2} rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Layouts"
        description="Manage calendar page layouts and ad placements"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Layout
          </Button>
        }
      />
      <DataTable
        columns={columns({
          onEdit: (layout) => {
            setEditing(layout);
            setFormOpen(true);
          },
        })}
        data={layouts}
        searchKey="name"
        searchPlaceholder="Search layouts..."
        emptyTitle="No layouts"
        emptyDescription="Get started by creating your first layout."
      />
      <LayoutForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />
    </div>
  );
}
