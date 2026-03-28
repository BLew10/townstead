"use client";

import { type ColumnDef } from "@tanstack/react-table";
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
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";

interface BlogPost {
  _id: Id<"blogPosts">;
  _creationTime: number;
  title: string;
  slug: string;
  status: "draft" | "pending" | "published";
  publishedAt?: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-500/20 dark:text-gray-300",
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300",
  published: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-500/20 dark:text-green-300",
};

function ActionsCell({ row }: { row: { original: BlogPost } }) {
  const softDelete = useMutation(api.blog.mutations.softDelete);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await softDelete({ id: row.original._id });
      toast.success("Blog post deleted");
    } catch {
      toast.error("Failed to delete blog post");
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
          <DropdownMenuItem
            onClick={() => window.location.href = `/admin/blog/${row.original._id}/edit`}
          >
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
        title="Delete Blog Post"
        description={`Are you sure you want to delete "${row.original.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
        loading={loading}
      />
    </>
  );
}

export const columns: ColumnDef<BlogPost>[] = [
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
    accessorKey: "slug",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Slug" />
    ),
    cell: ({ row }) => (
      <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
        {row.original.slug}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge className={statusColors[status] ?? "bg-gray-100 text-gray-700"}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "publishedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Published" />
    ),
    cell: ({ row }) =>
      row.original.publishedAt ? (
        formatDate(row.original.publishedAt)
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    sortingFn: "basic",
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];
