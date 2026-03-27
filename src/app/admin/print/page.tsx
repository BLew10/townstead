"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useOrg } from "@/hooks/use-org";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Printer } from "lucide-react";
import { CalendarInventoryGrid } from "@/components/admin/dashboard/calendar-inventory-grid";
import { AdvertiserLegend } from "@/components/admin/dashboard/advertiser-legend";
import { EmptyState } from "@/components/shared/empty-state";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

function buildPdfUrl(
  year: number,
  editionIds: Id<"calendarEditions">[],
  allAdCount: number,
  selectedAdIds: Id<"advertisements">[]
): string {
  const url = new URL("/api/pdf/inventory", window.location.origin);
  url.searchParams.set("year", String(year));
  url.searchParams.set("editionIds", editionIds.join(","));
  if (selectedAdIds.length === 0) {
    url.searchParams.set("adIds", "");
  } else if (selectedAdIds.length < allAdCount) {
    url.searchParams.set("adIds", selectedAdIds.join(","));
  }
  return url.toString();
}

export default function AdminPrintInventoryPage() {
  const { orgId, isReady } = useOrg();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedEditionIds, setSelectedEditionIds] = useState<
    Id<"calendarEditions">[]
  >([]);
  const [selectedAdIds, setSelectedAdIds] = useState<Id<"advertisements">[]>(
    []
  );
  const [filtersReady, setFiltersReady] = useState(false);

  const editions = useQuery(
    api.calendarEditions.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );

  const advertisements = useQuery(
    api.advertisements.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );

  useEffect(() => {
    if (!editions?.length || advertisements === undefined) return;
    if (!filtersReady) {
      setSelectedEditionIds(editions.map((e) => e._id));
      setSelectedAdIds(advertisements.map((a) => a._id));
      setFiltersReady(true);
    }
  }, [editions, advertisements, filtersReady]);

  const advertisementIdsArg =
    advertisements === undefined
      ? undefined
      : selectedAdIds.length === 0
        ? ([] as Id<"advertisements">[])
        : selectedAdIds.length === advertisements.length
          ? undefined
          : selectedAdIds;

  const printData = useQuery(
    api.dashboard.queries.getPrintInventoryData,
    isReady &&
      filtersReady &&
      selectedEditionIds.length > 0 &&
      advertisements !== undefined
      ? {
          orgId: orgId!,
          year: selectedYear,
          calendarEditionIds: selectedEditionIds,
          advertisementIds: advertisementIdsArg,
        }
      : "skip"
  );

  const toggleEdition = useCallback(
    (id: Id<"calendarEditions">, checked: boolean) => {
      setSelectedEditionIds((prev) =>
        checked ? [...prev, id] : prev.filter((e) => e !== id)
      );
    },
    []
  );

  const toggleAd = useCallback((id: Id<"advertisements">, checked: boolean) => {
    setSelectedAdIds((prev) =>
      checked ? [...prev, id] : prev.filter((a) => a !== id)
    );
  }, []);

  const downloadPdf = useCallback(() => {
    if (!advertisements?.length || selectedEditionIds.length === 0) return;
    const href = buildPdfUrl(
      selectedYear,
      selectedEditionIds,
      advertisements.length,
      selectedAdIds
    );
    window.open(href, "_blank", "noopener,noreferrer");
  }, [
    advertisements,
    selectedAdIds,
    selectedEditionIds,
    selectedYear,
  ]);

  if (!isReady || editions === undefined || advertisements === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (editions.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Print inventory</h1>
        <EmptyState
          title="No calendar editions"
          description="Create a calendar edition before printing inventory."
        />
      </div>
    );
  }

  const hasAnySlots =
    printData?.editions.some((e) => e.slots.length > 0) ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 print:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Print inventory</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(val) => val && setSelectedYear(parseInt(val, 10))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.print()}
              title="Print"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={downloadPdf}
              disabled={selectedEditionIds.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Calendar editions</Label>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-4">
              {editions.map((edition) => {
                const id = edition._id as Id<"calendarEditions">;
                const checked = selectedEditionIds.includes(id);
                return (
                  <div key={edition._id} className="flex items-center gap-2">
                    <Checkbox
                      id={`print-edition-${edition._id}`}
                      checked={checked}
                      onCheckedChange={(val) =>
                        toggleEdition(id, val === true)
                      }
                    />
                    <Label
                      htmlFor={`print-edition-${edition._id}`}
                      className="font-normal"
                    >
                      {edition.name}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Advertisement types</Label>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-4">
              {advertisements.map((ad) => {
                const id = ad._id as Id<"advertisements">;
                const checked = selectedAdIds.includes(id);
                return (
                  <div key={ad._id} className="flex items-center gap-2">
                    <Checkbox
                      id={`print-ad-${ad._id}`}
                      checked={checked}
                      onCheckedChange={(val) => toggleAd(id, val === true)}
                    />
                    <Label
                      htmlFor={`print-ad-${ad._id}`}
                      className="font-normal"
                    >
                      {ad.name}
                      {ad.isDayType ? (
                        <span className="text-muted-foreground">
                          {" "}
                          (day)
                        </span>
                      ) : null}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">
          Calendar ad inventory &mdash; {selectedYear}
        </h1>
      </div>

      {printData === undefined ? (
        <Skeleton className="h-96 w-full" />
      ) : printData.editions.length === 0 ? (
        <EmptyState
          title="No editions match"
          description="Select at least one edition that belongs to your organization."
        />
      ) : !hasAnySlots ? (
        <EmptyState
          title="No placements"
          description="No slots match the selected year, editions, and advertisement types."
        />
      ) : (
        <div className="space-y-10">
          {printData.editions.map((edition) =>
            edition.slots.length === 0 ? null : (
              <section key={edition.editionId} className="space-y-3">
                <h2 className="text-lg font-semibold print:text-base">
                  {edition.editionName}
                </h2>
                <CalendarInventoryGrid slots={edition.slots as any} />
              </section>
            )
          )}
          <AdvertiserLegend contacts={printData.contacts} />
        </div>
      )}
    </div>
  );
}
