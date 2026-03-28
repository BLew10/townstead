"use client";

import { type ColumnDef } from "@tanstack/react-table";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Community = Doc<"communities">;
type CalendarEdition = Doc<"calendarEditions">;

function ActionsCell({
  row,
  onEdit,
}: {
  row: { original: Community };
  onEdit: (community: Community) => void;
}) {
  const softDelete = useMutation(api.communities.mutations.softDelete);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await softDelete({ id: row.original._id });
      toast.success("Community deleted");
    } catch {
      toast.error("Failed to delete community");
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
        title="Delete Community"
        description={`Are you sure you want to delete "${row.original.name}"? This will soft-delete the community.`}
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
  calendarEditions,
}: {
  onEdit: (community: Community) => void;
  calendarEditions: CalendarEdition[];
}): ColumnDef<Community>[] {
  const editionMap = new Map<Id<"calendarEditions">, string>(
    calendarEditions.map((ed) => [ed._id, ed.name])
  );

  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "slug",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Slug" />
      ),
      cell: ({ row }) => (
        <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {row.getValue("slug")}
        </span>
      ),
    },
    {
      id: "calendars",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Calendars" />
      ),
      cell: ({ row }) => {
        const ids = row.original.calendarEditionIds;
        if (!ids.length) {
          return <span className="text-muted-foreground text-xs">None</span>;
        }
        const names = ids
          .map((id) => editionMap.get(id))
          .filter(Boolean);
        return (
          <Badge
            className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300"
            title={names.join(", ")}
          >
            {ids.length} {ids.length === 1 ? "calendar" : "calendars"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell row={row} onEdit={onEdit} />,
    },
  ];
}
