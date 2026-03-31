"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useOrg } from "@/hooks/use-org";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i;
  return { value: String(y), label: String(y) };
});
import type { Id } from "../../../../../../convex/_generated/dataModel";

interface SelectEditionYearProps {
  editionIds: Id<"calendarEditions">[];
  year: number;
  onEditionsChange: (
    ids: Id<"calendarEditions">[],
    names: string[]
  ) => void;
  onYearChange: (year: number) => void;
}

export function SelectEditionYear({
  editionIds,
  year,
  onEditionsChange,
  onYearChange,
}: SelectEditionYearProps) {
  const { orgId, isReady } = useOrg();
  const editions = useQuery(
    api.calendarEditions.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );

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
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Calendar Edition & Year</h3>
        <p className="text-sm text-muted-foreground">
          Select the calendar edition and year for this purchase.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Year</Label>
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
        </div>

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
