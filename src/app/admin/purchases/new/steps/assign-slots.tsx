"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import type { AdSelection } from "./select-ad-types";

export interface SlotAssignment {
  advertisementId: Id<"advertisements">;
  calendarEditionId: Id<"calendarEditions">;
  month: number;
  slotNumber?: number;
  date?: number;
}

interface AssignSlotsProps {
  calendarEditionIds: Id<"calendarEditions">[];
  editionNames: string[];
  year: number;
  adSelections: AdSelection[];
  slotAssignments: SlotAssignment[];
  onChange: (assignments: SlotAssignment[]) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_TYPE_MAX_SLOTS = 35;

export function AssignSlots({
  calendarEditionIds,
  editionNames,
  year,
  adSelections,
  slotAssignments,
  onChange,
}: AssignSlotsProps) {
  if (adSelections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No ad types selected. Go back and select ad types first.
      </p>
    );
  }

  const selectionsByEdition = calendarEditionIds.map((editionId, idx) => ({
    editionId,
    editionName: editionNames[idx] || "Edition",
    ads: adSelections.filter((s) => s.calendarEditionId === editionId),
  })).filter((group) => group.ads.length > 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Assign Slots</h3>
        <p className="text-sm text-muted-foreground">
          Day-type ads use a 35-slot grid per month. Other types use numbered
          slots per month; total selections must match each line&apos;s quantity.
        </p>
      </div>

      {selectionsByEdition.map(({ editionId, editionName, ads }) => (
        <div key={editionId} className="space-y-4">
          <h4 className="text-base font-semibold border-b pb-2">
            {editionName}
          </h4>

          {ads.map((ad) => {
            const key = `${ad.advertisementId}-${editionId}`;
            const assignments = slotAssignments.filter(
              (a) =>
                a.advertisementId === ad.advertisementId &&
                a.calendarEditionId === editionId
            );

            const handleAssignmentsChange = (
              newAssignments: SlotAssignment[]
            ) => {
              const others = slotAssignments.filter(
                (a) =>
                  !(
                    a.advertisementId === ad.advertisementId &&
                    a.calendarEditionId === editionId
                  )
              );
              onChange([...others, ...newAssignments]);
            };

            return ad.isDayType ? (
              <DayTypeSlotAssigner
                key={key}
                ad={ad}
                calendarEditionId={editionId}
                year={year}
                assignments={assignments}
                onAssignmentsChange={handleAssignmentsChange}
              />
            ) : (
              <NonDayTypeSlotAssigner
                key={key}
                ad={ad}
                calendarEditionId={editionId}
                year={year}
                assignments={assignments}
                onAssignmentsChange={handleAssignmentsChange}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DayTypeSlotAssigner({
  ad,
  calendarEditionId,
  year,
  assignments,
  onAssignmentsChange,
}: {
  ad: AdSelection;
  calendarEditionId: Id<"calendarEditions">;
  year: number;
  assignments: SlotAssignment[];
  onAssignmentsChange: (assignments: SlotAssignment[]) => void;
}) {
  const handleSlotToggle = (month: number, slotNumber: number) => {
    const alreadyAssigned = assignments.find(
      (a) => a.month === month && a.slotNumber === slotNumber
    );
    if (alreadyAssigned) {
      onAssignmentsChange(
        assignments.filter(
          (a) => !(a.month === month && a.slotNumber === slotNumber)
        )
      );
    } else if (assignments.length < ad.quantity) {
      onAssignmentsChange([
        ...assignments,
        {
          advertisementId: ad.advertisementId,
          calendarEditionId,
          month,
          slotNumber,
        },
      ]);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{ad.advertisementName}</h4>
        <Badge>
          {assignments.length} / {ad.quantity} assigned
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Click a slot to assign or unassign. Day-type ads allow shared slots.
      </p>
      <div className="space-y-6">
        {MONTHS.map((name, idx) => {
          const month = idx + 1;
          return (
            <div key={month} className="space-y-2">
              <p className="text-sm font-medium">{name}</p>
              <SlotGrid
                calendarEditionId={calendarEditionId}
                year={year}
                month={month}
                advertisementId={ad.advertisementId}
                isDayType={true}
                totalSlots={DAY_TYPE_MAX_SLOTS}
                columnCount={7}
                localAssignments={assignments}
                onSelectSlot={(slotNumber) =>
                  handleSlotToggle(month, slotNumber)
                }
              />
            </div>
          );
        })}
      </div>

      {assignments.length > 0 && <AssignedBadges assignments={assignments} />}
    </div>
  );
}

function NonDayTypeSlotAssigner({
  ad,
  calendarEditionId,
  year,
  assignments,
  onAssignmentsChange,
}: {
  ad: AdSelection;
  calendarEditionId: Id<"calendarEditions">;
  year: number;
  assignments: SlotAssignment[];
  onAssignmentsChange: (assignments: SlotAssignment[]) => void;
}) {
  const slotsPerMonth = Math.max(1, ad.slotsPerMonth);

  const handleSlotToggle = (month: number, slotNumber: number) => {
    const alreadyAssigned = assignments.find(
      (a) => a.month === month && a.slotNumber === slotNumber
    );
    if (alreadyAssigned) {
      onAssignmentsChange(
        assignments.filter(
          (a) => !(a.month === month && a.slotNumber === slotNumber)
        )
      );
    } else if (assignments.length < ad.quantity) {
      onAssignmentsChange([
        ...assignments,
        {
          advertisementId: ad.advertisementId,
          calendarEditionId,
          month,
          slotNumber,
        },
      ]);
    }
  };

  const columnCount = slotsPerMonth <= 7 ? slotsPerMonth : 7;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="font-medium">{ad.advertisementName}</h4>
          <p className="text-xs text-muted-foreground">
            {slotsPerMonth} slots per month &middot; select {ad.quantity} total
          </p>
        </div>
        <Badge
          variant={
            assignments.length === ad.quantity ? "default" : "secondary"
          }
        >
          {assignments.length} / {ad.quantity}
        </Badge>
      </div>

      {assignments.length < ad.quantity && (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          Choose {ad.quantity - assignments.length} more slot
          {ad.quantity - assignments.length === 1 ? "" : "s"}.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Toggle slots on or off. Gray = taken by another purchase.
      </p>
      <div className="space-y-6">
        {MONTHS.map((name, idx) => {
          const month = idx + 1;
          return (
            <div key={month} className="space-y-2">
              <p className="text-sm font-medium">{name}</p>
              <SlotGrid
                calendarEditionId={calendarEditionId}
                year={year}
                month={month}
                advertisementId={ad.advertisementId}
                isDayType={false}
                totalSlots={slotsPerMonth}
                columnCount={columnCount}
                localAssignments={assignments}
                onSelectSlot={(slotNumber) =>
                  handleSlotToggle(month, slotNumber)
                }
              />
            </div>
          );
        })}
      </div>

      {assignments.length > 0 && <AssignedBadges assignments={assignments} />}
    </div>
  );
}

function AssignedBadges({ assignments }: { assignments: SlotAssignment[] }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">Assigned:</p>
      <div className="flex flex-wrap gap-2">
        {assignments.map((a, idx) => (
          <Badge key={idx} variant="outline">
            {MONTHS[(a.month ?? 1) - 1]} &mdash; Slot #{a.slotNumber}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function SlotGrid({
  calendarEditionId,
  year,
  month,
  advertisementId,
  isDayType,
  totalSlots,
  columnCount,
  localAssignments,
  onSelectSlot,
}: {
  calendarEditionId: Id<"calendarEditions">;
  year: number;
  month: number;
  advertisementId: Id<"advertisements">;
  isDayType: boolean;
  totalSlots: number;
  columnCount: number;
  localAssignments: SlotAssignment[];
  onSelectSlot: (slotNumber: number) => void;
}) {
  const { orgId, isReady } = useOrg();
  const availability = useQuery(
    api.adSlots.queries.getSlotAvailability,
    isReady && calendarEditionId
      ? {
          calendarEditionId,
          year,
          month,
          advertisementId,
          orgId: orgId!,
          isDayType,
        }
      : "skip"
  );

  const takenSlots = availability?.takenSlots ?? {};

  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: totalSlots }, (_, i) => {
        const num = i + 1;
        const isTaken = num in takenSlots;
        const isLocallyAssigned = localAssignments.some(
          (a) => a.month === month && a.slotNumber === num
        );

        return (
          <button
            key={num}
            type="button"
            role="checkbox"
            aria-checked={isLocallyAssigned}
            disabled={isTaken && !isLocallyAssigned}
            onClick={() => onSelectSlot(num)}
            className={cn(
              "flex h-9 w-full items-center justify-center rounded text-sm font-medium transition-colors",
              isTaken &&
                !isLocallyAssigned &&
                "cursor-not-allowed bg-muted text-muted-foreground",
              isLocallyAssigned && "bg-primary text-primary-foreground",
              !isTaken &&
                !isLocallyAssigned &&
                "border hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}
