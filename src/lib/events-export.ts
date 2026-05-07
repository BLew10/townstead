import { format } from "date-fns";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { expandEventOccurrences } from "@/lib/events/recurrence";

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
  communityId: Id<"communities"> | null
): Doc<"events">[] {
  return events
    .filter((e) => {
      if (expandEventOccurrences(e, year).length === 0) return false;
      if (communityId) {
        const ids = e.communityIds ?? [];
        if (!ids.includes(communityId)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aDate = expandEventOccurrences(a, year)[0]?.date ?? a.date;
      const bDate = expandEventOccurrences(b, year)[0]?.date ?? b.date;
      return aDate - bDate;
    });
}

export function buildEventExportMonthGroups(
  events: Doc<"events">[],
  year: number,
  communityId: Id<"communities"> | null
): EventExportMonthGroup[] {
  const filtered = filterEventsForExport(events, year, communityId);
  const buckets: { event: Doc<"events">; date: number }[][] = Array.from(
    { length: 12 },
    () => []
  );

  for (const e of filtered) {
    for (const occurrence of expandEventOccurrences(e, year)) {
      buckets[new Date(occurrence.date).getMonth()].push({
        event: e,
        date: occurrence.date,
      });
    }
  }

  return buckets.map((monthEvents, monthIndex) => ({
    monthIndex,
    items: monthEvents
      .sort((a, b) => a.date - b.date)
      .map(({ event, date }) => ({
        name: event.name,
        dateStr: format(new Date(date), "EEE, MMM d, yyyy"),
        times: formatEventTimes(event),
        description: (event.description ?? "").trim() || "—",
      })),
  }));
}
