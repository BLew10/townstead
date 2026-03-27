"use client";

import { type ColumnDef } from "@tanstack/react-table";
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
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => formatDate(row.original.date),
    sortingFn: "basic",
  },
  {
    accessorKey: "contactName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contact" />
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
    accessorKey: "method",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Method" />
    ),
    cell: ({ row }) => (
      <span className="capitalize">
        {row.original.method?.replace("_", " ") ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "checkNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Check #" />
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
