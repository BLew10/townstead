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
import { CalendarEditionForm } from "./calendar-edition-form";
import type { Doc } from "../../../../convex/_generated/dataModel";

export default function CalendarsPage() {
  const { orgId, isReady } = useOrg();
  const editions = useQuery(
    api.calendarEditions.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"calendarEditions"> | null>(null);

  if (!isReady || editions === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calendar Editions" />
        <TableSkeleton columns={3} rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar Editions"
        description="Manage your calendar editions and their codes"
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Edition
          </Button>
        }
      />
      <DataTable
        columns={columns({ onEdit: (ed) => { setEditing(ed); setFormOpen(true); } })}
        data={editions}
        searchKey="name"
        searchPlaceholder="Search editions..."
        emptyTitle="No calendar editions"
        emptyDescription="Get started by creating your first calendar edition."
      />
      <CalendarEditionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />
    </div>
  );
}
