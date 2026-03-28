"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export interface PaymentRow {
  _id: string;
  date: number;
  amount: number;
  method?: string | null;
  checkNumber?: string | null;
  invoiceNumber?: string | null;
  purchaseId: string;
  contactId: string | null;
  contactEmail: string | null;
  contactName: string;
  company: string;
}

export const paymentColumns: ColumnDef<PaymentRow>[] = [
  {
    accessorKey: "contactName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company Name" />
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {row.original.company || row.original.contactName}
        </p>
        {row.original.company && (
          <p className="text-xs text-muted-foreground">
            {row.original.contactName}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => formatCurrency(row.original.amount),
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Date" />
    ),
    cell: ({ row }) => formatDate(row.original.date),
    sortingFn: "basic",
  },
  {
    accessorKey: "method",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Method" />
    ),
    cell: ({ row }) => {
      const method = row.original.method;
      if (!method) return "—";
      const methodColors: Record<string, string> = {
        check: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300",
        credit_card: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300",
        cash: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300",
        trade: "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-100 dark:bg-violet-500/20 dark:text-violet-300",
        ach: "bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-100 dark:bg-cyan-500/20 dark:text-cyan-300",
      };
      return (
        <Badge className={`capitalize ${methodColors[method] ?? "bg-muted text-muted-foreground"}`}>
          {method.replace("_", " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "checkNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Check Number" />
    ),
    cell: ({ row }) => row.original.checkNumber ?? "—",
  },
  {
    accessorKey: "invoiceNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Invoice #" />
    ),
    cell: ({ row }) =>
      row.original.invoiceNumber ? (
        <Link
          href={`/admin/purchases/${row.original.purchaseId}`}
          className="text-primary hover:underline"
        >
          {row.original.invoiceNumber}
        </Link>
      ) : (
        "—"
      ),
  },
];
