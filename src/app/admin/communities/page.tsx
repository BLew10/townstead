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
import { CommunityForm } from "./community-form";
import type { Doc } from "../../../../convex/_generated/dataModel";

export default function CommunitiesPage() {
  const { orgId, isReady } = useOrg();
  const communities = useQuery(
    api.communities.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const calendarEditions = useQuery(
    api.calendarEditions.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"communities"> | null>(null);

  if (!isReady || communities === undefined || calendarEditions === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Communities" />
        <TableSkeleton columns={4} rows={5} />
      </div>
    );
  }

  const handleEdit = (community: Doc<"communities">) => {
    setEditing(community);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communities"
        description="Manage your communities and their calendar editions"
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Community
          </Button>
        }
      />
      <DataTable
        columns={columns({ onEdit: handleEdit, calendarEditions })}
        data={communities}
        searchKey="name"
        searchPlaceholder="Search communities..."
        emptyTitle="No communities"
        emptyDescription="Get started by creating your first community."
      />
      <CommunityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        calendarEditions={calendarEditions}
      />
    </div>
  );
}
