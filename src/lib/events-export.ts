import { format } from "date-fns";
import type { Doc, Id } from "../../convex/_generated/dataModel";

export type EventExportItem = {
  name: string;
  dateStr: string;
  times: string;
  description: string;
};

export type EventExportMonthGroup = {
  monthIndex: number;
  items: EventExportItem[];
};

export function formatEventTimes(event: Doc<"events">): string {
  const parts = [event.startTime, event.endTime].filter(Boolean);
  return parts.length > 0 ? parts.join(" – ") : "—";
}

export function filterEventsForExport(
  events: Doc<"events">[],
  year: number,
  editionId: Id<"calendarEditions"> | null
): Doc<"events">[] {
  return events
    .filter((e) => {
      if (new Date(e.date).getFullYear() !== year) return false;
      if (editionId) {
        const ids = e.calendarEditionIds ?? [];
        if (!ids.includes(editionId)) return false;
      }
      return true;
    })
    .sort((a, b) => a.date - b.date);
}

export function buildEventExportMonthGroups(
  events: Doc<"events">[],
  year: number,
  editionId: Id<"calendarEditions"> | null
): EventExportMonthGroup[] {
  const filtered = filterEventsForExport(events, year, editionId);
  const buckets: Doc<"events">[][] = Array.from({ length: 12 }, () => []);

  for (const e of filtered) {
    buckets[new Date(e.date).getMonth()].push(e);
  }

  return buckets.map((monthEvents, monthIndex) => ({
    monthIndex,
    items: monthEvents.map((e) => ({
      name: e.name,
      dateStr: format(new Date(e.date), "EEE, MMM d, yyyy"),
      times: formatEventTimes(e),
      description: (e.description ?? "").trim() || "—",
    })),
  }));
}
