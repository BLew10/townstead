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
import { AddressBookForm } from "./address-book-form";
import type { Doc } from "../../../../convex/_generated/dataModel";

export default function AddressBooksPage() {
  const { orgId, isReady } = useOrg();
  const addressBooks = useQuery(
    api.addressBooks.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"addressBooks"> | null>(null);

  if (!isReady || addressBooks === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Address Books" />
        <TableSkeleton columns={2} rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Address Books"
        description="Organize contacts into address books"
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Address Book
          </Button>
        }
      />
      <DataTable
        columns={columns({ onEdit: (ab) => { setEditing(ab); setFormOpen(true); } })}
        data={addressBooks}
        searchKey="name"
        searchPlaceholder="Search address books..."
        emptyTitle="No address books"
        emptyDescription="Get started by creating your first address book."
      />
      <AddressBookForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />
    </div>
  );
}
