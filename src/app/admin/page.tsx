"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useOrg } from "@/hooks/use-org";
import { useStableNow } from "@/hooks/use-stable-now";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown, Printer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContactColor, getContrastText } from "@/lib/colors";
import { StatsCards } from "@/components/admin/dashboard/stats-cards";
import { CalendarInventoryGrid } from "@/components/admin/dashboard/calendar-inventory-grid";
import { AdvertiserLegend } from "@/components/admin/dashboard/advertiser-legend";
import { EmptyState } from "@/components/shared/empty-state";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

export default function AdminDashboardPage() {
  const { orgId, isReady } = useOrg();
  const now = useStableNow();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedEditionId, setSelectedEditionId] = useState<string>("");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(
    new Set()
  );
  const [contactFilterOpen, setContactFilterOpen] = useState(false);

  const editions = useQuery(
    api.calendarEditions.queries.list,
    isReady ? { orgId: orgId! } : "skip"
  );

  const editionId = selectedEditionId || editions?.[0]?._id;

  const slotsData = useQuery(
    api.dashboard.queries.getDashboardSlots,
    isReady && editionId
      ? {
          orgId: orgId!,
          calendarEditionId: editionId as Id<"calendarEditions">,
          year: selectedYear,
        }
      : "skip"
  );

  const stats = useQuery(
    api.dashboard.queries.getDashboardStats,
    isReady && editionId
      ? {
          orgId: orgId!,
          calendarEditionId: editionId as Id<"calendarEditions">,
          year: selectedYear,
          now,
        }
      : "skip"
  );

  useEffect(() => {
    setSelectedContactIds(new Set());
  }, [editionId, selectedYear]);

  const toggleContact = useCallback((contactId: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }, []);

  const isFiltered = selectedContactIds.size > 0;

  const filteredSlots = useMemo(() => {
    if (!slotsData || !isFiltered) return slotsData?.slots ?? [];
    return slotsData.slots.filter((s: { contactId: string }) =>
      selectedContactIds.has(s.contactId)
    );
  }, [slotsData, selectedContactIds, isFiltered]);

  const filteredContacts = useMemo(() => {
    if (!slotsData || !isFiltered) return slotsData?.contacts ?? [];
    return slotsData.contacts.filter((c: { id: string }) =>
      selectedContactIds.has(c.id)
    );
  }, [slotsData, selectedContactIds, isFiltered]);

  if (!isReady || editions === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (editions.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <EmptyState
          title="No calendar editions"
          description="Create a calendar edition to see inventory and statistics."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-3">
          <Select
            value={editionId ?? ""}
            onValueChange={(val) => setSelectedEditionId(val ?? "")}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select edition...">
                {editions.find((e) => e._id === editionId)?.name ??
                  "Select edition..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {editions.map((ed) => (
                <SelectItem key={ed._id} value={ed._id}>
                  {ed.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          {slotsData && slotsData.contacts.length > 0 && (
            <Popover
              open={contactFilterOpen}
              onOpenChange={setContactFilterOpen}
            >
              <PopoverTrigger
                className={cn(
                  "inline-flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs",
                  "hover:bg-accent hover:text-accent-foreground",
                  "min-w-[160px] max-w-[280px]"
                )}
              >
                <span className="truncate">
                  {isFiltered
                    ? `${selectedContactIds.size} advertiser${selectedContactIds.size !== 1 ? "s" : ""}`
                    : "All advertisers"}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search advertisers..." />
                  <CommandList>
                    <CommandEmpty>No advertisers found.</CommandEmpty>
                    <CommandGroup>
                      {slotsData.contacts.map(
                        (contact: { id: string; company: string }) => {
                          const isSelected = selectedContactIds.has(contact.id);
                          const bg = getContactColor(contact.id);
                          const fg = getContrastText(bg);
                          return (
                            <CommandItem
                              key={contact.id}
                              value={contact.company}
                              onSelect={() => toggleContact(contact.id)}
                              data-checked={isSelected || undefined}
                            >
                              <span
                                className="mr-1 inline-block h-3 w-3 shrink-0 rounded-sm"
                                style={{ backgroundColor: bg }}
                              />
                              <span className="min-w-0 flex-1 truncate">
                                {contact.company}
                              </span>
                            </CommandItem>
                          );
                        }
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
                {isFiltered && (
                  <div className="border-t p-1">
                    <button
                      className="w-full rounded-sm px-2 py-1.5 text-center text-xs text-muted-foreground hover:bg-muted"
                      onClick={() => setSelectedContactIds(new Set())}
                    >
                      Clear filter
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => window.print()}
            title="Print inventory"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active filter badges */}
      {isFiltered && slotsData && (
        <div className="flex flex-wrap items-center gap-1.5 print:hidden">
          <span className="text-xs text-muted-foreground">Showing:</span>
          {slotsData.contacts
            .filter((c: { id: string }) => selectedContactIds.has(c.id))
            .map((contact: { id: string; company: string }) => {
              const bg = getContactColor(contact.id);
              const fg = getContrastText(bg);
              return (
                <Badge
                  key={contact.id}
                  className="gap-1 pr-1"
                  style={{ backgroundColor: bg, color: fg }}
                >
                  {contact.company}
                  <button
                    onClick={() => toggleContact(contact.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          <button
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            onClick={() => setSelectedContactIds(new Set())}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Print-only header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">
          Calendar Inventory &mdash;{" "}
          {editions.find((e) => e._id === editionId)?.name} {selectedYear}
        </h1>
      </div>

      <StatsCards stats={stats} />

      {slotsData === undefined ? (
        <Skeleton className="h-96 w-full" />
      ) : filteredSlots.length === 0 ? (
        <EmptyState
          title={
            isFiltered
              ? "No matching placements"
              : "No ad placements"
          }
          description={
            isFiltered
              ? "No slots match the selected advertisers."
              : "No slots have been assigned for this edition and year yet."
          }
        />
      ) : (
        <>
          <CalendarInventoryGrid slots={filteredSlots as any} />
          <AdvertiserLegend contacts={filteredContacts} />
        </>
      )}
    </div>
  );
}
