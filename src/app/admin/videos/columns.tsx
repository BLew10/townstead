"use client";

import { type ColumnDef } from "@tanstack/react-table";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

type Video = Doc<"videos">;

function ActionsCell({
  row,
  onEdit,
}: {
  row: { original: Video };
  onEdit: (video: Video) => void;
}) {
  const softDelete = useMutation(api.videos.mutations.softDelete);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await softDelete({ id: row.original._id });
      toast.success("Video deleted");
    } catch {
      toast.error("Failed to delete video");
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
          <DropdownMenuSeparator />
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
        title="Delete Video"
        description={`Are you sure you want to delete "${row.original.title}"? This action cannot be undone.`}
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
  contacts,
  categories,
}: {
  onEdit: (video: Video) => void;
  contacts: Doc<"contacts">[];
  categories: Doc<"categories">[];
}): ColumnDef<Video>[] {
  const contactMap = new Map(contacts.map((c) => [c._id, c]));
  const categoryMap = new Map(categories.map((c) => [c._id, c.name]));

  return [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="URL" />
      ),
      cell: ({ row }) => {
        const url = row.original.url;
        if (!url) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs max-w-[200px] truncate block text-muted-foreground">
            {url}
          </span>
        );
      },
    },
    {
      id: "business",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Business" />
      ),
      cell: ({ row }) => {
        const contact = row.original.businessContactId
          ? contactMap.get(row.original.businessContactId)
          : null;
        if (!contact)
          return <span className="text-muted-foreground">—</span>;
        return (
          contact.company ||
          [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
          "—"
        );
      },
    },
    {
      id: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => {
        const name = row.original.categoryId
          ? categoryMap.get(row.original.categoryId)
          : null;
        if (!name) return <span className="text-muted-foreground">—</span>;
        return (
          <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100 dark:bg-cyan-500/20 dark:text-cyan-300">
            {name}
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
