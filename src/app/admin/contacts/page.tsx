"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
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
import { useState } from "react";
import { columns } from "./columns";
import { ContactForm } from "./contact-form";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { downloadCsv, downloadXlsx } from "@/lib/export/spreadsheet";
import { contactExportColumns } from "@/lib/export/columns/contacts";

export default function ContactsPage() {
  const { orgId, isReady } = useOrg();
  const contacts = useQuery(
    api.contacts.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const addressBooks = useQuery(
    api.addressBooks.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"contacts"> | null>(null);

  if (!isReady || contacts === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Contacts" />
        <TableSkeleton columns={5} rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Manage your contacts and customer relationships"
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={contacts.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    downloadXlsx(
                      contacts,
                      contactExportColumns,
                      "Contacts",
                      "contacts.xlsx"
                    )
                  }
                >
                  Download as XLSX
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    downloadCsv(contacts, contactExportColumns, "contacts.csv")
                  }
                >
                  Download as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </div>
        }
      />
      <DataTable
        columns={columns({
          onEdit: (contact) => {
            setEditing(contact);
            setFormOpen(true);
          },
        })}
        data={contacts}
        searchKey="company"
        searchPlaceholder="Search by company..."
        emptyTitle="No contacts"
        emptyDescription="Get started by adding your first contact."
        initialSorting={[{ id: "company", desc: false }]}
      />
      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        addressBooks={addressBooks ?? []}
      />
    </div>
  );
}
