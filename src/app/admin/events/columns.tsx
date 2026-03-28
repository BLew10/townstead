"use client";

import { type ColumnDef } from "@tanstack/react-table";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

type Event = Doc<"events">;

function ActionsCell({
  row,
  onEdit,
}: {
  row: { original: Event };
  onEdit: (event: Event) => void;
}) {
  const softDelete = useMutation(api.events.mutations.softDelete);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await softDelete({ id: row.original._id });
      toast.success("Event deleted");
    } catch {
      toast.error("Failed to delete event");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(row.original)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Event"
        description={`Are you sure you want to delete "${row.original.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
        loading={loading}
      />
    </>
  );
}

export function columns({
  onEdit,
  communities,
}: {
  onEdit: (event: Event) => void;
  communities: Doc<"communities">[];
}): ColumnDef<Event>[] {
  const communityMap = new Map(communities.map((c) => [c._id, c.name]));

  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => formatDate(row.original.date),
      sortingFn: "basic",
    },
    {
      id: "recurring",
      header: "Recurring",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.isYearly ? (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300">
            Yearly
          </Badge>
        ) : null,
    },
    {
      id: "communities",
      header: "Communities",
      enableSorting: false,
      cell: ({ row }) => {
        const ids = row.original.communityIds;
        if (!ids || ids.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1">
            {ids.map((id) => (
              <Badge key={id} className="bg-teal-100 text-teal-800 hover:bg-teal-100 dark:bg-teal-500/20 dark:text-teal-300">
                {communityMap.get(id) ?? "Unknown"}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell row={row} onEdit={onEdit} />,
    },
  ];
}
