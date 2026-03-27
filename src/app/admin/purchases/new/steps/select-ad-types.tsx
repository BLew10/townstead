"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import type { SlotAssignment } from "./assign-slots";
import { SlotPlacementModal } from "./slot-placement-modal";

export interface AdSelection {
  advertisementId: Id<"advertisements">;
  calendarEditionId: Id<"calendarEditions">;
  advertisementName: string;
  isDayType: boolean;
  quantity: number;
  charge?: number;
  slotsPerMonth: number;
}

interface SelectAdTypesProps {
  calendarEditionIds: Id<"calendarEditions">[];
  editionNames: string[];
  year: number;
  selections: AdSelection[];
  slotAssignments: SlotAssignment[];
  onChange: (selections: AdSelection[]) => void;
  onSlotsChange: (assignments: SlotAssignment[]) => void;
  purchaseId?: Id<"purchases">;
}

export function SelectAdTypes({
  calendarEditionIds,
  editionNames,
  year,
  selections,
  slotAssignments,
  onChange,
  onSlotsChange,
  purchaseId,
}: SelectAdTypesProps) {
  const { orgId, isReady } = useOrg();
  const advertisements = useQuery(
    api.advertisements.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );

  const [modalState, setModalState] = useState<{
    open: boolean;
    adId: Id<"advertisements"> | null;
    adName: string;
    editionId: Id<"calendarEditions"> | null;
    isDayType: boolean;
    slotsPerMonth: number;
    quantity: number;
  }>({
    open: false,
    adId: null,
    adName: "",
    editionId: null,
    isDayType: false,
    slotsPerMonth: 0,
    quantity: 0,
  });

  const getSelection = (
    adId: Id<"advertisements">,
    editionId: Id<"calendarEditions">
  ) =>
    selections.find(
      (s) => s.advertisementId === adId && s.calendarEditionId === editionId
    );

  const getSlotsForCell = (
    adId: Id<"advertisements">,
    editionId: Id<"calendarEditions">
  ) =>
    slotAssignments.filter(
      (a) => a.advertisementId === adId && a.calendarEditionId === editionId
    );

  const updateSelection = (
    adId: Id<"advertisements">,
    adName: string,
    isDayType: boolean,
    editionId: Id<"calendarEditions">,
    slotsPerMonth: number,
    updates: Partial<Pick<AdSelection, "quantity" | "charge">>
  ) => {
    const existing = getSelection(adId, editionId);
    const newQuantity = updates.quantity ?? existing?.quantity ?? 0;
    const newCharge = updates.charge !== undefined ? updates.charge : existing?.charge;
    const others = selections.filter(
      (s) =>
        !(s.advertisementId === adId && s.calendarEditionId === editionId)
    );

    if (newQuantity > 0 || (newCharge != null && newCharge > 0)) {
      onChange([
        ...others,
        {
          advertisementId: adId,
          calendarEditionId: editionId,
          advertisementName: adName,
          isDayType,
          quantity: Math.max(0, newQuantity),
          charge: newCharge,
          slotsPerMonth,
        },
      ]);

      if (slotsPerMonth > 0 && updates.quantity !== undefined) {
        const cellSlots = getSlotsForCell(adId, editionId);
        const clampedQty = Math.max(0, newQuantity);
        if (cellSlots.length > clampedQty) {
          const trimmed = cellSlots.length - clampedQty;
          const otherSlots = slotAssignments.filter(
            (a) =>
              !(a.advertisementId === adId && a.calendarEditionId === editionId)
          );
          onSlotsChange([...otherSlots, ...cellSlots.slice(0, clampedQty)]);
          toast.info(
            `${trimmed} placement${trimmed > 1 ? "s" : ""} removed to match new quantity`
          );
        }
      }
    } else {
      onChange(others);
      clearSlotsForCell(adId, editionId);
    }
  };

  const clearCell = (
    adId: Id<"advertisements">,
    editionId: Id<"calendarEditions">
  ) => {
    onChange(
      selections.filter(
        (s) =>
          !(s.advertisementId === adId && s.calendarEditionId === editionId)
      )
    );
    clearSlotsForCell(adId, editionId);
  };

  const clearSlotsForCell = (
    adId: Id<"advertisements">,
    editionId: Id<"calendarEditions">
  ) => {
    onSlotsChange(
      slotAssignments.filter(
        (a) =>
          !(a.advertisementId === adId && a.calendarEditionId === editionId)
      )
    );
  };

  const openPlacementModal = (
    adId: Id<"advertisements">,
    adName: string,
    isDayType: boolean,
    editionId: Id<"calendarEditions">,
    slotsPerMonth: number
  ) => {
    const sel = getSelection(adId, editionId);
    setModalState({
      open: true,
      adId,
      adName,
      editionId,
      isDayType,
      slotsPerMonth,
      quantity: sel?.quantity ?? 0,
    });
  };

  const handleModalSave = (assignments: SlotAssignment[]) => {
    if (!modalState.adId || !modalState.editionId) return;
    const others = slotAssignments.filter(
      (a) =>
        !(
          a.advertisementId === modalState.adId &&
          a.calendarEditionId === modalState.editionId
        )
    );
    onSlotsChange([...others, ...assignments]);
  };

  if (calendarEditionIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Please select at least one calendar edition first.
      </p>
    );
  }

  const totalUnits = selections.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Purchase Details</h3>
        <p className="text-sm text-muted-foreground">
          Set quantities, charges, and assign ad placements for each calendar
          edition.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-sm font-medium min-w-[180px]">
                Advertisement Type
              </th>
              {calendarEditionIds.map((editionId, idx) => (
                <th
                  key={editionId}
                  className="min-w-[300px] border-l px-4 py-3 text-sm font-medium"
                >
                  <div className="text-primary">{editionNames[idx] || "Edition"}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {advertisements?.map((ad, rowIdx) => (
              <tr
                key={ad._id}
                className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20"}
              >
                <td className="sticky left-0 z-10 px-4 py-3 bg-inherit">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ad.name}</span>
                    <Badge
                      variant={ad.isDayType ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {ad.isDayType ? "Day" : "Non-Day"}
                    </Badge>
                  </div>
                </td>
                {calendarEditionIds.map((editionId) => {
                  const sel = getSelection(ad._id, editionId);
                  const cellSlots = getSlotsForCell(ad._id, editionId);
                  const quantity = sel?.quantity ?? 0;
                  const charge = sel?.charge ?? 0;
                  const hasData = quantity > 0 || charge > 0;
                  const needsPlacement =
                    ad.slotsPerMonth > 0 && quantity > 0 && cellSlots.length === 0;
                  const partiallyPlaced =
                    ad.slotsPerMonth > 0 && quantity > 0 && cellSlots.length > 0 && cellSlots.length < quantity;
                  const fullyPlaced =
                    ad.slotsPerMonth > 0 && quantity > 0 && cellSlots.length === quantity;

                  return (
                    <td
                      key={`${ad._id}-${editionId}`}
                      className="border-l px-4 py-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="space-y-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min={0}
                            value={quantity}
                            onChange={(e) =>
                              updateSelection(
                                ad._id,
                                ad.name,
                                ad.isDayType,
                                editionId,
                                ad.slotsPerMonth,
                                { quantity: parseInt(e.target.value, 10) || 0 }
                              )
                            }
                            className="w-20"
                            placeholder="0"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Charge</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9.]*"
                            value={charge || ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              updateSelection(
                                ad._id,
                                ad.name,
                                ad.isDayType,
                                editionId,
                                ad.slotsPerMonth,
                                { charge: isNaN(val) ? 0 : val }
                              );
                            }}
                            className="w-24"
                            placeholder="$0.00"
                          />
                        </div>

                        {ad.slotsPerMonth > 0 && (
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant={
                                      fullyPlaced
                                        ? "default"
                                        : partiallyPlaced
                                          ? "secondary"
                                          : needsPlacement
                                            ? "destructive"
                                            : "outline"
                                    }
                                    size="sm"
                                    className={cn(
                                      "min-w-[90px]",
                                      needsPlacement && "animate-pulse"
                                    )}
                                    disabled={quantity === 0}
                                    onClick={() =>
                                      openPlacementModal(
                                        ad._id,
                                        ad.name,
                                        ad.isDayType,
                                        editionId,
                                        ad.slotsPerMonth
                                      )
                                    }
                                  >
                                    {fullyPlaced ? (
                                      <>
                                        <Check className="h-4 w-4 mr-1" />
                                        {cellSlots.length} Placed
                                      </>
                                    ) : partiallyPlaced ? (
                                      `${cellSlots.length}/${quantity} Placed`
                                    ) : needsPlacement ? (
                                      "Required"
                                    ) : (
                                      "Place"
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {quantity === 0
                                    ? "Set quantity before placing"
                                    : needsPlacement
                                      ? "Placement required before continuing"
                                      : partiallyPlaced
                                        ? `${cellSlots.length} of ${quantity} slots placed`
                                        : fullyPlaced
                                          ? `All ${quantity} slots placed`
                                          : "Place advertisement position"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {hasData && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() =>
                                        clearCell(ad._id, editionId)
                                      }
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Clear quantity, charge, and placements
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}

                        {ad.slotsPerMonth === 0 && hasData && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => clearCell(ad._id, editionId)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Clear quantity and charge
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {advertisements?.length === 0 && (
              <tr>
                <td
                  colSpan={1 + calendarEditionIds.length}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  No advertisement types have been created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selections.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-sm font-medium">
            Selected: {selections.length} line item(s), {totalUnits} total units
          </p>
        </div>
      )}

      {modalState.open && modalState.adId && modalState.editionId && (
        <SlotPlacementModal
          open={modalState.open}
          onOpenChange={(open) =>
            setModalState((prev) => ({ ...prev, open }))
          }
          advertisementId={modalState.adId}
          advertisementName={modalState.adName}
          calendarEditionId={modalState.editionId}
          isDayType={modalState.isDayType}
          slotsPerMonth={modalState.slotsPerMonth}
          quantity={modalState.quantity}
          year={year}
          existingAssignments={getSlotsForCell(
            modalState.adId,
            modalState.editionId
          )}
          onSave={handleModalSave}
          excludePurchaseId={purchaseId}
        />
      )}
    </div>
  );
}
