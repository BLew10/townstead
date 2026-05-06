"use client";

import { useState } from "react";
import type { Column } from "@tanstack/react-table";
import { Check, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface DataTableFacetedFilterProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  options: FilterOption[];
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const [open, setOpen] = useState(false);
  const facets = column.getFacetedUniqueValues();
  const filterValue = column.getFilterValue() as string[] | undefined;
  const selected = new Set(filterValue);

  function toggleOption(value: string) {
    const next = new Set(selected);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    const arr = Array.from(next);
    column.setFilterValue(arr.length ? arr : undefined);
  }

  function clearAll() {
    column.setFilterValue(undefined);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8",
              selected.size > 0
                ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                : "border-dashed"
            )}
          />
        }
      >
        <PlusCircle className="size-3.5" />
        {title}
        {selected.size > 0 && (
          <>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <div className="flex gap-1">
              {selected.size > 2 ? (
                <Badge className="rounded-sm bg-primary px-1 font-normal text-primary-foreground hover:bg-primary/90">
                  {selected.size} selected
                </Badge>
              ) : (
                options
                  .filter((opt) => selected.has(opt.value))
                  .map((opt) => (
                    <Badge
                      key={opt.value}
                      className="rounded-sm bg-primary px-1 font-normal text-primary-foreground hover:bg-primary/90"
                    >
                      {opt.label}
                    </Badge>
                  ))
              )}
            </div>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = selected.has(opt.value);
                const count = facets?.get(opt.value) ?? 0;
                return (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => toggleOption(opt.value)}
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="size-3" />
                    </div>
                    {opt.icon && <opt.icon className="size-4 text-muted-foreground" />}
                    <span>{opt.label}</span>
                    {count > 0 && (
                      <span className="ml-auto flex size-4 items-center justify-center font-mono text-xs">
                        {count}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={clearAll}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
