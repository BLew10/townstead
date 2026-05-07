"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { cn } from "@/lib/utils";
import { getContactColor, getContrastText } from "@/lib/colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarDays, Check } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import type { SlotAssignment } from "./assign-slots";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type OccupantInfo = {
  adPurchaseId: string;
  contactId: string;
  contactName: string;
  company: string;
};

type TakenSlots = Record<number, OccupantInfo[]>;

function getOccupantBackground(occupants: OccupantInfo[]): string {
  if (occupants.length === 1) {
    return getContactColor(occupants[0].contactId);
  }
  const pct = 100 / occupants.length;
  const stops = occupants
    .map((o, i) => {
      const color = getContactColor(o.contactId);
      return `${color} ${pct * i}%, ${color} ${pct * (i + 1)}%`;
    })
    .join(", ");
  return `linear-gradient(135deg, ${stops})`;
}

function occupantLabel(o: OccupantInfo): string {
  return o.company || o.contactName || "Unknown";
}

interface SlotPlacementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advertisementId: Id<"advertisements">;
  advertisementName: string;
  calendarEditionId: Id<"calendarEditions">;
  isDayType: boolean;
  slotsPerMonth: number;
  quantity: number;
  year: number;
  existingAssignments: SlotAssignment[];
  onSave: (assignments: SlotAssignment[]) => void;
  excludePurchaseId?: Id<"purchases">;
}

export function SlotPlacementModal({
  open,
  onOpenChange,
  advertisementId,
  advertisementName,
  calendarEditionId,
  isDayType,
  slotsPerMonth,
  quantity,
  year,
  existingAssignments,
  onSave,
  excludePurchaseId,
}: SlotPlacementModalProps) {
  const [localAssignments, setLocalAssignments] = useState<SlotAssignment[]>([]);

  useEffect(() => {
    if (open) {
      setLocalAssignments([...existingAssignments]);
    }
  }, [open, existingAssignments]);

  const handleSave = () => {
    onSave(localAssignments);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setLocalAssignments([]);
  };

  const handleSlotToggle = (month: number, slotNumber: number) => {
    const exists = localAssignments.find(
      (a) => a.month === month && a.slotNumber === slotNumber
    );
    if (exists) {
      setLocalAssignments(
        localAssignments.filter(
          (a) => !(a.month === month && a.slotNumber === slotNumber)
        )
      );
    } else {
      if (localAssignments.length >= quantity) {
        toast.info(
          `Maximum of ${quantity} slot${quantity !== 1 ? "s" : ""} allowed for this quantity`
        );
        return;
      }
      setLocalAssignments([
        ...localAssignments,
        { advertisementId, calendarEditionId, month, slotNumber },
      ]);
    }
  };

  const totalSlots = isDayType ? 42 : Math.max(1, slotsPerMonth);
  const columnCount = isDayType ? 7 : Math.min(slotsPerMonth, 7);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              Select slots for {advertisementName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  localAssignments.length === quantity
                    ? "default"
                    : localAssignments.length > 0
                      ? "secondary"
                      : "outline"
                }
                className="font-normal"
              >
                {localAssignments.length} / {quantity} slot
                {quantity !== 1 ? "s" : ""} selected
              </Badge>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear All
              </Button>
            </div>
          </div>
        </DialogHeader>

        <SlotLegend isDayType={isDayType} />

        <div className="flex-1 overflow-y-auto -mx-4 px-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MONTHS.map((monthName, monthIndex) => {
              const month = monthIndex + 1;
              const monthAssignments = localAssignments.filter(
                (a) => a.month === month
              );

              return (
                <div key={month} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      {monthName}
                    </h4>
                    <Badge variant="outline" className="text-xs font-normal">
                      {monthAssignments.length} selected
                    </Badge>
                  </div>

                  {isDayType ? (
                    <DayTypeGrid
                      calendarEditionId={calendarEditionId}
                      advertisementId={advertisementId}
                      year={year}
                      month={month}
                      monthIndex={monthIndex}
                      localAssignments={localAssignments}
                      onToggle={handleSlotToggle}
                      excludePurchaseId={excludePurchaseId}
                    />
                  ) : (
                    <NonDayTypeGrid
                      calendarEditionId={calendarEditionId}
                      advertisementId={advertisementId}
                      year={year}
                      month={month}
                      totalSlots={totalSlots}
                      columnCount={columnCount}
                      localAssignments={localAssignments}
                      onToggle={handleSlotToggle}
                      excludePurchaseId={excludePurchaseId}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Selections</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SlotLegend({ isDayType }: { isDayType: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded border border-muted-foreground/20" />
        Available
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded border-2 border-primary bg-primary/10" />
        Your selection
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-3 rounded"
          style={{ backgroundColor: "hsl(210, 70%, 50%)", opacity: 0.7 }}
        />
        {isDayType ? "Occupied (shared)" : "Occupied (unavailable)"}
      </span>
      {isDayType && (
        <span className="text-muted-foreground/70 italic">
          Day slots allow multiple advertisers
        </span>
      )}
    </div>
  );
}

function DayTypeGrid({
  calendarEditionId,
  advertisementId,
  year,
  month,
  monthIndex,
  localAssignments,
  onToggle,
  excludePurchaseId,
}: {
  calendarEditionId: Id<"calendarEditions">;
  advertisementId: Id<"advertisements">;
  year: number;
  month: number;
  monthIndex: number;
  localAssignments: SlotAssignment[];
  onToggle: (month: number, slotNumber: number) => void;
  excludePurchaseId?: Id<"purchases">;
}) {
  const GRID_CELLS = 42;
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  const { orgId, isReady } = useOrg();
  const availability = useQuery(
    api.adSlots.queries.getSlotAvailability,
    isReady
      ? {
          calendarEditionId,
          year,
          month,
          advertisementId,
          orgId: orgId!,
          isDayType: true,
          ...(excludePurchaseId ? { excludePurchaseId } : {}),
        }
      : "skip"
  );

  const takenSlots: TakenSlots = (availability?.takenSlots as TakenSlots) ?? {};

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1).getDay();

  const grid = Array.from({ length: GRID_CELLS }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    const isValid = dayNumber > 0 && dayNumber <= daysInMonth;
    return { position: i + 1, dayNumber: isValid ? dayNumber : null };
  });

  return (
    <TooltipProvider delay={200}>
      <div className="rounded-lg border p-2">
        <div className="grid grid-cols-7 text-center mb-1">
          {weekDays.map((day, i) => (
            <div
              key={i}
              className="text-xs font-medium text-muted-foreground p-0.5"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {grid.map((cell) => {
            const isSelected = localAssignments.some(
              (a) => a.month === month && a.slotNumber === cell.position
            );
            const occupants = takenSlots[cell.position] ?? [];
            const hasOccupants = occupants.length > 0;

            const cellStyle: React.CSSProperties = {};
            if (hasOccupants && !isSelected) {
              const bg = getOccupantBackground(occupants);
              if (occupants.length === 1) {
                cellStyle.backgroundColor = bg;
              } else {
                cellStyle.background = bg;
              }
            }

            const textColor =
              hasOccupants && !isSelected && occupants.length === 1
                ? getContrastText(getContactColor(occupants[0].contactId))
                : undefined;

            const cellContent = (
              <button
                key={cell.position}
                type="button"
                onClick={() => onToggle(month, cell.position)}
                style={cellStyle}
                className={cn(
                  "relative aspect-square flex items-center justify-center rounded text-xs font-medium transition-opacity",
                  isSelected
                    ? "border-2 border-primary bg-primary/10 hover:opacity-90"
                    : hasOccupants
                      ? "border border-transparent hover:opacity-80"
                      : "border border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/20",
                  !cell.dayNumber && !hasOccupants && !isSelected && "opacity-60"
                )}
              >
                {cell.dayNumber && (
                  <span style={textColor ? { color: textColor } : undefined}>
                    {cell.dayNumber}
                  </span>
                )}
                {isSelected && (
                  <div className="absolute top-0.5 right-0.5 rounded-full bg-primary w-1.5 h-1.5" />
                )}
                {hasOccupants && !isSelected && occupants.length > 1 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground text-background text-[8px] font-bold leading-none">
                    {occupants.length}
                  </span>
                )}
                <span className="absolute bottom-0 right-0.5 text-[7px] text-muted-foreground/60">
                  {cell.position}
                </span>
              </button>
            );

            if (hasOccupants) {
              return (
                <Tooltip key={cell.position}>
                  <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="font-medium text-xs mb-0.5">
                      {occupants.length} advertiser{occupants.length > 1 ? "s" : ""}
                    </p>
                    {occupants.map((o, i) => (
                      <p key={i} className="text-xs flex items-center gap-1">
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: getContactColor(o.contactId) }}
                        />
                        {occupantLabel(o)}
                      </p>
                    ))}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return cellContent;
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

function NonDayTypeGrid({
  calendarEditionId,
  advertisementId,
  year,
  month,
  totalSlots,
  columnCount,
  localAssignments,
  onToggle,
  excludePurchaseId,
}: {
  calendarEditionId: Id<"calendarEditions">;
  advertisementId: Id<"advertisements">;
  year: number;
  month: number;
  totalSlots: number;
  columnCount: number;
  localAssignments: SlotAssignment[];
  onToggle: (month: number, slotNumber: number) => void;
  excludePurchaseId?: Id<"purchases">;
}) {
  const { orgId, isReady } = useOrg();
  const availability = useQuery(
    api.adSlots.queries.getSlotAvailability,
    isReady
      ? {
          calendarEditionId,
          year,
          month,
          advertisementId,
          orgId: orgId!,
          isDayType: false,
          ...(excludePurchaseId ? { excludePurchaseId } : {}),
        }
      : "skip"
  );

  const takenSlots: TakenSlots = (availability?.takenSlots as TakenSlots) ?? {};

  return (
    <TooltipProvider delay={200}>
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: totalSlots }, (_, i) => {
          const num = i + 1;
          const occupants = takenSlots[num] ?? [];
          const isTaken = occupants.length > 0;
          const isLocallyAssigned = localAssignments.some(
            (a) => a.month === month && a.slotNumber === num
          );

          const occupant = occupants[0];
          const bgColor = isTaken && occupant
            ? getContactColor(occupant.contactId)
            : undefined;
          const fgColor = bgColor ? getContrastText(bgColor) : undefined;

          const btn = (
            <button
              key={num}
              type="button"
              disabled={isTaken && !isLocallyAssigned}
              onClick={() => onToggle(month, num)}
              style={
                isTaken && !isLocallyAssigned && bgColor
                  ? { backgroundColor: bgColor, color: fgColor }
                  : undefined
              }
              className={cn(
                "flex h-9 w-full items-center justify-center rounded text-sm font-medium transition-colors",
                isTaken &&
                  !isLocallyAssigned &&
                  "cursor-not-allowed opacity-80",
                isLocallyAssigned && "bg-primary text-primary-foreground",
                !isTaken &&
                  !isLocallyAssigned &&
                  "border hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {num}
            </button>
          );

          if (isTaken && !isLocallyAssigned) {
            return (
              <Tooltip key={num}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="top">
                  <p className="font-medium text-xs">
                    {occupantLabel(occupant)}
                  </p>
                  <p className="text-xs text-muted-foreground">Slot taken</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return btn;
        })}
      </div>
    </TooltipProvider>
  );
}
