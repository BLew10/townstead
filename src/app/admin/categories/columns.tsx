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
import { toast } from "sonner";

type Category = Doc<"categories">;

const typeBadgeColors: Record<string, string> = {
  event: "bg-pink-100 text-pink-800 hover:bg-pink-100 dark:bg-pink-500/20 dark:text-pink-300",
  blog: "bg-slate-100 text-slate-800 hover:bg-slate-100 dark:bg-slate-500/20 dark:text-slate-300",
  video: "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-300",
  business: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300",
};

function ActionsCell({
  row,
  onEdit,
}: {
  row: { original: Category };
  onEdit: (category: Category) => void;
}) {
  const softDelete = useMutation(api.categories.mutations.softDelete);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await softDelete({ id: row.original._id });
      toast.success("Category deleted");
    } catch {
      toast.error("Failed to delete category");
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
        title="Delete Category"
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
}: {
  onEdit: (category: Category) => void;
}): ColumnDef<Category>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.original.type;
        return (
          <Badge className={typeBadgeColors[type] ?? "bg-gray-100 text-gray-700"}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
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
