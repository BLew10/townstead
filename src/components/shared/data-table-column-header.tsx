"use client";

import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "-ml-2 h-8 text-xs font-semibold uppercase tracking-wide text-primary/80 hover:text-primary dark:text-primary/90 dark:hover:text-primary",
        sorted && "text-primary dark:text-primary",
        className,
      )}
      onClick={() => column.toggleSorting()}
    >
      {title}
      {sorted === "desc" ? (
        <ArrowDown className="ml-1 size-3.5" />
      ) : sorted === "asc" ? (
        <ArrowUp className="ml-1 size-3.5" />
      ) : (
        <ChevronsUpDown className="ml-1 size-3.5 opacity-50" />
      )}
    </Button>
  );
}
