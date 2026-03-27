"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface PurchaseRow {
  _id: string;
  invoiceNumber?: string;
  contactName: string;
  company: string;
  editionName: string;
  year: number;
  net: number;
  amountPaid: number;
  isPaid: boolean;
  hasLate: boolean;
}

function computeStatus(row: PurchaseRow): string {
  if (row.isPaid) return "paid";
  if (row.hasLate) return "overdue";
  if (row.amountPaid > 0) return "partial";
  return "unpaid";
}

const statusDisplay: Record<string, { label: string; variant?: "destructive" | "secondary"; className?: string }> = {
  paid: { label: "Paid", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  overdue: { label: "Overdue", variant: "destructive" },
  partial: { label: "Partial", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  unpaid: { label: "Unpaid", variant: "secondary" },
};

function StatusBadge({ status }: { status: string }) {
  const display = statusDisplay[status] ?? statusDisplay.unpaid;
  return (
    <Badge variant={display.variant} className={display.className}>
      {display.label}
    </Badge>
  );
}

function ActionsCell({ row }: { row: { original: PurchaseRow } }) {
  const router = useRouter();
  const softDelete = useMutation(api.purchases.mutations.softDelete);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await softDelete({ id: row.original._id as any });
      toast.success("Purchase deleted");
    } catch {
      toast.error("Failed to delete purchase");
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
            onClick={() =>
              router.push(`/admin/purchases/${row.original._id}`)
            }
          >
            <Eye className="mr-2 h-4 w-4" />
            View
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
        title="Delete Purchase"
        description={`Are you sure you want to delete invoice ${row.original.invoiceNumber ?? "this purchase"}? This will remove all associated payments, allocations, and slot assignments.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
        loading={loading}
      />
    </>
  );
}

export function purchaseColumns({
  yearOptions,
}: {
  yearOptions: { label: string; value: string }[];
}): ColumnDef<PurchaseRow>[] {
  return [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice #",
    },
    {
      accessorKey: "contactName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact" />
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.contactName}</p>
          {row.original.company && (
            <p className="text-xs text-muted-foreground">
              {row.original.company}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "editionName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Edition" />
      ),
    },
    {
      id: "year",
      accessorFn: (row) => String(row.year),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Year" />
      ),
      filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      meta: {
        filterOptions: yearOptions,
      },
    },
    {
      accessorKey: "net",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Net" />
      ),
      cell: ({ row }) => formatCurrency(row.original.net),
    },
    {
      accessorKey: "amountPaid",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Paid" />
      ),
      cell: ({ row }) => formatCurrency(row.original.amountPaid),
    },
    {
      id: "status",
      accessorFn: (row) => computeStatus(row),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      meta: {
        filterOptions: [
          { label: "Paid", value: "paid" },
          { label: "Partial", value: "partial" },
          { label: "Overdue", value: "overdue" },
          { label: "Unpaid", value: "unpaid" },
        ],
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell row={row} />,
    },
  ];
}
