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
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { toast } from "sonner";

type AddressBook = Doc<"addressBooks">;

function ActionsCell({ row, onEdit }: { row: { original: AddressBook }; onEdit: (ab: AddressBook) => void }) {
  const remove = useMutation(api.addressBooks.mutations.remove);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await remove({ id: row.original._id });
      toast.success("Address book removed");
    } catch {
      toast.error("Failed to remove address book");
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
        title="Delete Address Book"
        description={`Are you sure you want to delete "${row.original.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
        loading={loading}
      />
    </>
  );
}

export function columns({ onEdit }: { onEdit: (ab: AddressBook) => void }): ColumnDef<AddressBook>[] {
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
      accessorKey: "displayLevel",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Display Level" />
      ),
      cell: ({ row }) => {
        const level = row.original.displayLevel;
        if (!level) return <span className="text-muted-foreground">—</span>;
        const levelColors: Record<string, string> = {
          primary: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300",
          secondary: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300",
        };
        return (
          <Badge className={levelColors[level] ?? "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-500/20 dark:text-gray-300"}>
            {level}
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
