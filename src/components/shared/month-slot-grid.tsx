"use client";

import { cn } from "@/lib/utils";
import { getContactColor, getContrastText } from "@/lib/colors";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export interface SlotOccupant {
  contactId: string;
  contactName?: string;
  company?: string;
  advertisementName?: string;
  purchaseId?: string;
}

export type MonthSlotGridMode = "readonly" | "editor";

export interface MonthSlotGridProps {
  year: number;
  month: number;
  slotsPerMonth?: number;
  occupants: Record<number, SlotOccupant[]>;
  selectedSlots?: Set<number>;
  mode: MonthSlotGridMode;
  onToggle?: (slotNumber: number) => void;
  onCellClick?: (slotNumber: number, occupants: SlotOccupant[]) => void;
}

export function getOccupantBackground(occupants: SlotOccupant[]): string {
  if (occupants.length === 1) return getContactColor(occupants[0].contactId);
  const pct = 100 / occupants.length;
  const stops = occupants
    .map((o, i) => {
      const c = getContactColor(o.contactId);
      return `${c} ${pct * i}%, ${c} ${pct * (i + 1)}%`;
    })
    .join(", ");
  return `linear-gradient(135deg, ${stops})`;
}

function occupantLabel(o: SlotOccupant): string {
  return o.company || o.contactName || "Unknown";
}

function daysInMonthFor(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function MonthSlotGrid({
  year,
  month,
  slotsPerMonth = 35,
  occupants,
  selectedSlots,
  mode,
  onToggle,
  onCellClick,
}: MonthSlotGridProps) {
  const daysInMonth = daysInMonthFor(year, month);
  const totalCells = Math.max(slotsPerMonth, 1);

  return (
    <TooltipProvider delay={200}>
      <div className="rounded-lg border p-1.5">
        <div className="grid grid-cols-7 text-center mb-1">
          {WEEKDAY_LABELS.map((day, i) => (
            <div
              key={i}
              className="text-[10px] font-semibold text-muted-foreground py-0.5"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: totalCells }, (_, i) => {
            const slotNumber = i + 1;
            const dayOfMonth = slotNumber <= daysInMonth ? slotNumber : null;
            const cellOccupants = occupants[slotNumber] ?? [];
            const hasOccupants = cellOccupants.length > 0;
            const isSelected = selectedSlots?.has(slotNumber) ?? false;
            const isFloating = dayOfMonth === null;

            const cellStyle: React.CSSProperties = {};
            let textColor: string | undefined;
            const showOccupantBg = hasOccupants && !isSelected;
            if (showOccupantBg) {
              const bg = getOccupantBackground(cellOccupants);
              if (cellOccupants.length === 1) {
                cellStyle.backgroundColor = bg;
                textColor = getContrastText(bg);
              } else {
                cellStyle.background = bg;
                textColor = "#ffffff";
              }
              if (mode === "editor") cellStyle.opacity = 0.75;
            }

            const interactive =
              mode === "editor" || (mode === "readonly" && hasOccupants);

            const handleClick = () => {
              if (mode === "editor") {
                onToggle?.(slotNumber);
              } else if (hasOccupants) {
                onCellClick?.(slotNumber, cellOccupants);
              }
            };

            const dayLabel = dayOfMonth ? String(dayOfMonth).padStart(2, "0") : "";
            const slotLabel = String(slotNumber).padStart(2, "0");
            const ariaLabel = `Slot ${slotNumber}${
              dayOfMonth ? `, day ${dayOfMonth}` : ", floating"
            }${isSelected ? ", selected" : hasOccupants ? ", occupied" : ", open"}`;

            const cellNode = (
              <button
                type="button"
                onClick={interactive ? handleClick : undefined}
                disabled={!interactive}
                aria-label={ariaLabel}
                aria-pressed={mode === "editor" ? isSelected : undefined}
                style={cellStyle}
                className={cn(
                  "group relative aspect-square w-full rounded text-[10px] leading-none transition-colors",
                  "flex flex-col justify-between p-0.5 tabular-nums",
                  isSelected &&
                    "border-2 border-emerald-500 bg-emerald-100/70 dark:bg-emerald-900/40",
                  !isSelected &&
                    !hasOccupants &&
                    "border border-muted-foreground/25 bg-card hover:border-primary/40",
                  !isSelected && hasOccupants && "border border-transparent",
                  interactive && "cursor-pointer",
                  !interactive && "cursor-default",
                  isFloating && !hasOccupants && !isSelected && "bg-muted/30",
                )}
              >
                <span className="flex items-start justify-between w-full">
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      !textColor && "text-rose-600 dark:text-rose-400",
                    )}
                    style={textColor ? { color: textColor } : undefined}
                  >
                    {dayLabel}
                  </span>
                  <span
                    className={cn(
                      "text-[8px] font-medium",
                      !textColor && "text-muted-foreground/70",
                    )}
                    style={textColor ? { color: textColor, opacity: 0.85 } : undefined}
                  >
                    {slotLabel}
                  </span>
                </span>
                <span className="flex items-center justify-center w-full gap-1">
                  {isSelected && (
                    <span className="text-emerald-700 dark:text-emerald-300 text-[11px] font-bold leading-none">
                      ✓
                    </span>
                  )}
                  {hasOccupants && cellOccupants.length > 1 && (
                    <span
                      className="text-[9px] font-bold leading-none"
                      style={textColor ? { color: textColor } : undefined}
                    >
                      ×{cellOccupants.length}
                    </span>
                  )}
                  {!isSelected && !hasOccupants && (
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-[2px] border border-muted-foreground/40 group-hover:border-primary/60"
                    />
                  )}
                </span>
              </button>
            );

            const showTooltip = hasOccupants;
            if (showTooltip) {
              return (
                <Tooltip key={slotNumber}>
                  <TooltipTrigger asChild>{cellNode}</TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    <p className="font-medium text-xs mb-0.5">
                      Slot {slotNumber}
                      {dayOfMonth ? ` · Day ${dayOfMonth}` : " · Floating"}
                    </p>
                    {cellOccupants.map((o, idx) => (
                      <p
                        key={idx}
                        className="text-xs flex items-center gap-1 mt-0.5"
                      >
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: getContactColor(o.contactId) }}
                        />
                        <span className="truncate">{occupantLabel(o)}</span>
                        {o.advertisementName && (
                          <span className="text-muted-foreground truncate">
                            · {o.advertisementName}
                          </span>
                        )}
                      </p>
                    ))}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={slotNumber}>{cellNode}</div>;
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
