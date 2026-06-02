"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
  /** Unix milliseconds at local midnight, or undefined for empty. */
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  /** Disable dates before this Date (inclusive comparison done by day). */
  fromDate?: Date;
  /** Disable dates after this Date (inclusive comparison done by day). */
  toDate?: Date;
  /** Hide the inline clear button (e.g. when the field is required). */
  hideClear?: boolean;
  className?: string;
  buttonClassName?: string;
  id?: string;
  ariaLabel?: string;
  /** Optional render-format for the trigger label. Defaults to MMM d, yyyy. */
  displayFormat?: string;
}

/** Build a local-midnight Date from a Unix ms timestamp. */
function fromTimestamp(ts: number | undefined): Date | undefined {
  if (!ts) return undefined;
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Coerce a react-day-picker Date selection to a local-midnight Unix ms. */
function toTimestamp(date: Date | undefined): number | undefined {
  if (!date) return undefined;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  fromDate,
  toDate,
  hideClear = false,
  className,
  buttonClassName,
  id,
  ariaLabel,
  displayFormat = "MMM d, yyyy",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = fromTimestamp(value);

  const handleSelect = (date: Date | undefined) => {
    onChange(toTimestamp(date));
    if (date) setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(undefined);
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              id={id}
              aria-label={ariaLabel ?? placeholder}
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selected && "text-muted-foreground",
                !hideClear && selected && "pr-9",
                buttonClassName
              )}
            />
          }
        >
          <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" />
          {selected ? format(selected, displayFormat) : placeholder}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected ?? new Date()}
            disabled={
              fromDate || toDate
                ? (date) => {
                    if (fromDate && date < fromDate) return true;
                    if (toDate && date > toDate) return true;
                    return false;
                  }
                : undefined
            }
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {!hideClear && selected && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground opacity-70 transition-opacity hover:bg-muted hover:opacity-100"
          aria-label="Clear date"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
