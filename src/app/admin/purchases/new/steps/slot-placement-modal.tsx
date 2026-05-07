"use client";

import { useState, useEffect, useMemo } from "react";
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
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import type { SlotAssignment } from "./assign-slots";
import {
  MonthSlotGrid,
  type SlotOccupant,
} from "@/components/shared/month-slot-grid";

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

  const dayTypeSlots = Math.max(35, slotsPerMonth || 35);
  const totalSlots = isDayType ? dayTypeSlots : Math.max(1, slotsPerMonth);
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
                      slotsPerMonth={dayTypeSlots}
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
        <span className="inline-block h-3 w-3 rounded border border-muted-foreground/30 bg-card" />
        Open
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded border-2 border-emerald-500 bg-emerald-100" />
        Your selection
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-3 rounded"
          style={{ backgroundColor: "hsl(210, 70%, 50%)", opacity: 0.75 }}
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
  slotsPerMonth,
  localAssignments,
  onToggle,
  excludePurchaseId,
}: {
  calendarEditionId: Id<"calendarEditions">;
  advertisementId: Id<"advertisements">;
  year: number;
  month: number;
  slotsPerMonth: number;
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
          isDayType: true,
          ...(excludePurchaseId ? { excludePurchaseId } : {}),
        }
      : "skip"
  );

  const occupantsBySlot = useMemo<Record<number, SlotOccupant[]>>(() => {
    const taken: TakenSlots = (availability?.takenSlots as TakenSlots) ?? {};
    const out: Record<number, SlotOccupant[]> = {};
    for (const [slotKey, list] of Object.entries(taken)) {
      out[Number(slotKey)] = list.map((o) => ({
        contactId: o.contactId,
        contactName: o.contactName,
        company: o.company,
      }));
    }
    return out;
  }, [availability?.takenSlots]);

  const selectedSlots = useMemo(
    () =>
      new Set(
        localAssignments
          .filter((a) => a.month === month && typeof a.slotNumber === "number")
          .map((a) => a.slotNumber as number),
      ),
    [localAssignments, month],
  );

  return (
    <MonthSlotGrid
      year={year}
      month={month}
      slotsPerMonth={slotsPerMonth}
      occupants={occupantsBySlot}
      selectedSlots={selectedSlots}
      mode="editor"
      onToggle={(slotNumber) => onToggle(month, slotNumber)}
    />
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
