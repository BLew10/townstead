"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { useStableNow } from "@/hooks/use-stable-now";
import { formatCurrency } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ExternalLink, Calendar, Lock } from "lucide-react";
import Link from "next/link";
import type { Id } from "../../../../../../convex/_generated/dataModel";

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i;
  return { value: String(y), label: String(y) };
});

interface SelectEditionYearProps {
  editionIds: Id<"calendarEditions">[];
  year: number;
  contactId: Id<"contacts"> | null;
  excludePurchaseId?: Id<"purchases">;
  yearLocked?: boolean;
  onEditionsChange: (
    ids: Id<"calendarEditions">[],
    names: string[]
  ) => void;
  onYearChange: (year: number) => void;
}

export function SelectEditionYear({
  editionIds,
  year,
  contactId,
  excludePurchaseId,
  yearLocked = false,
  onEditionsChange,
  onYearChange,
}: SelectEditionYearProps) {
  const { orgId, isReady } = useOrg();
  const now = useStableNow();

  const editions = useQuery(
    api.calendarEditions.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );

  const existingPurchaseRaw = useQuery(
    api.purchases.queries.getByContactAndYear,
    contactId ? { contactId, year, now } : "skip"
  );

  const existingPurchase =
    existingPurchaseRaw && excludePurchaseId && existingPurchaseRaw._id === excludePurchaseId
      ? null
      : existingPurchaseRaw;

  const namesForIds = (ids: Id<"calendarEditions">[]) =>
    ids.map((eid) => {
      const e = editions?.find((ed) => ed._id === eid);
      return e ? `${e.name} (${e.code})` : "";
    });

  const toggleEdition = (
    id: Id<"calendarEditions">,
    name: string,
    checked: boolean
  ) => {
    if (checked) {
      const nextIds = [...editionIds, id];
      onEditionsChange(nextIds, [...namesForIds(editionIds), name]);
    } else {
      const nextIds = editionIds.filter((eid) => eid !== id);
      onEditionsChange(nextIds, namesForIds(nextIds));
    }
  };

  const selectedLabels =
    editionIds.length === 0
      ? []
      : editionIds.map((eid) => {
          const ed = editions?.find((e) => e._id === eid);
          return ed
            ? `${ed.name} (${ed.code})`
            : String(eid);
        });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
          <Calendar className="h-5 w-5 text-violet-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Calendar Edition & Year</h3>
          <p className="text-sm text-muted-foreground">
            Select the calendar edition and year for this purchase.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Edition Year</Label>
          {yearLocked ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{year}</span>
            </div>
          ) : (
            <Select
              value={String(year)}
              onValueChange={(v) => v != null && onYearChange(parseInt(v, 10))}
            >
              <SelectTrigger>
                <SelectValue>{year}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {existingPurchase && (
          <div className="sm:col-span-2 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  This contact already has a purchase for {year}
                </p>
                <p className="text-sm text-muted-foreground">
                  {existingPurchase.editionCode} &mdash;{" "}
                  {existingPurchase.isPaid
                    ? "Fully paid"
                    : `${formatCurrency(existingPurchase.amountPaid)} of ${formatCurrency(existingPurchase.net)} paid`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/admin/purchases/${existingPurchase._id}/edit`} />}
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Edit Existing Purchase
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label>Calendar Editions</Label>
          <div className="space-y-2 rounded-md border p-4">
            {editions?.map((edition) => {
              const id = edition._id as Id<"calendarEditions">;
              const checked = editionIds.includes(id);
              return (
                <div
                  key={edition._id}
                  className="flex items-center gap-2"
                >
                  <Checkbox
                    id={`edition-${edition._id}`}
                    checked={checked}
                    onCheckedChange={(val) => {
                      toggleEdition(
                        id,
                        edition.name,
                        val === true
                      );
                    }}
                  />
                  <Label htmlFor={`edition-${edition._id}`}>
                    {edition.name} ({edition.code})
                  </Label>
                </div>
              );
            })}
          </div>
          {selectedLabels.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Selected: {selectedLabels.join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
