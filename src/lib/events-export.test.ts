import { describe, it, expect } from "vitest";
import {
  formatEventTimes,
  filterEventsForExport,
  buildEventExportMonthGroups,
} from "./events-export";
import type { Doc, Id } from "../../convex/_generated/dataModel";

type EventDoc = Doc<"events">;

function makeEvent(
  overrides: Partial<EventDoc> & { name: string; date: number }
): EventDoc {
  return {
    _id: `event_${overrides.name}` as Id<"events">,
    _creationTime: 0,
    orgId: "test_org",
    ...overrides,
  } as EventDoc;
}

describe("formatEventTimes", () => {
  it("joins start and end times with dash", () => {
    const event = makeEvent({
      name: "Fair",
      date: 0,
      startTime: "10:00 AM",
      endTime: "4:00 PM",
    });
    expect(formatEventTimes(event)).toBe("10:00 AM – 4:00 PM");
  });

  it("returns only start time when no end time", () => {
    const event = makeEvent({
      name: "Fair",
      date: 0,
      startTime: "10:00 AM",
    });
    expect(formatEventTimes(event)).toBe("10:00 AM");
  });

  it("returns only end time when no start time", () => {
    const event = makeEvent({
      name: "Fair",
      date: 0,
      endTime: "4:00 PM",
    });
    expect(formatEventTimes(event)).toBe("4:00 PM");
  });

  it("returns em dash when no times", () => {
    const event = makeEvent({ name: "Fair", date: 0 });
    expect(formatEventTimes(event)).toBe("—");
  });
});

describe("filterEventsForExport", () => {
  const jan2026 = new Date(2026, 0, 15).getTime();
  const jun2026 = new Date(2026, 5, 10).getTime();
  const jan2025 = new Date(2025, 0, 15).getTime();

  const events = [
    makeEvent({ name: "A", date: jun2026, calendarEditionIds: ["ed_1" as Id<"calendarEditions">] }),
    makeEvent({ name: "B", date: jan2026, calendarEditionIds: ["ed_1" as Id<"calendarEditions">, "ed_2" as Id<"calendarEditions">] }),
    makeEvent({ name: "C", date: jan2025 }),
    makeEvent({ name: "D", date: jan2026, calendarEditionIds: ["ed_2" as Id<"calendarEditions">] }),
  ];

  it("filters by year", () => {
    const result = filterEventsForExport(events, 2026, null);
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.name)).not.toContain("C");
  });

  it("includes recurring events with occurrences in the export year", () => {
    const result = filterEventsForExport(
      [
        makeEvent({
          name: "Yearly",
          date: jan2025,
          isYearly: true,
          scheduleType: "SINGLE_DAY",
        }),
      ],
      2026,
      null
    );
    expect(result.map((e) => e.name)).toEqual(["Yearly"]);
  });

  it("filters by year and calendar edition ID", () => {
    const result = filterEventsForExport(
      events,
      2026,
      "ed_1" as Id<"calendarEditions">
    );
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name)).toEqual(["B", "A"]);
  });

  it("sorts results by date ascending", () => {
    const result = filterEventsForExport(events, 2026, null);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date).toBeGreaterThanOrEqual(result[i - 1].date);
    }
  });

  it("returns empty for a year with no events", () => {
    expect(filterEventsForExport(events, 2030, null)).toEqual([]);
  });

  it("includes events without calendarEditionIds when edition filter is null", () => {
    const eventsWithNone = [
      makeEvent({ name: "NoEdition", date: jan2026 }),
    ];
    const result = filterEventsForExport(eventsWithNone, 2026, null);
    expect(result).toHaveLength(1);
  });

  it("excludes events without calendarEditionIds when edition filter is set", () => {
    const eventsWithNone = [
      makeEvent({ name: "NoEdition", date: jan2026 }),
    ];
    const result = filterEventsForExport(
      eventsWithNone,
      2026,
      "ed_1" as Id<"calendarEditions">
    );
    expect(result).toHaveLength(0);
  });
});

describe("buildEventExportMonthGroups", () => {
  const jan15 = new Date(2026, 0, 15).getTime();
  const mar10 = new Date(2026, 2, 10).getTime();

  it("returns 12 month groups", () => {
    const result = buildEventExportMonthGroups([], 2026, null);
    expect(result).toHaveLength(12);
    expect(result[0].monthIndex).toBe(0);
    expect(result[11].monthIndex).toBe(11);
  });

  it("buckets events into correct months", () => {
    const events = [
      makeEvent({ name: "Jan Event", date: jan15 }),
      makeEvent({ name: "Mar Event", date: mar10 }),
    ];
    const result = buildEventExportMonthGroups(events, 2026, null);
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].name).toBe("Jan Event");
    expect(result[2].items).toHaveLength(1);
    expect(result[2].items[0].name).toBe("Mar Event");
  });

  it("buckets each occurrence of repeating events", () => {
    const events = [
      makeEvent({
        name: "Festival",
        date: new Date(2026, 4, 10).getTime(),
        startsOn: new Date(2026, 4, 10).getTime(),
        endsOn: new Date(2026, 4, 12).getTime(),
        scheduleType: "DAILY_RANGE",
      }),
    ];
    const result = buildEventExportMonthGroups(events, 2026, null);
    expect(result[4].items.map((item) => item.dateStr)).toHaveLength(3);
  });

  it("empty months have empty items array", () => {
    const events = [makeEvent({ name: "Jan Event", date: jan15 })];
    const result = buildEventExportMonthGroups(events, 2026, null);
    for (let i = 1; i < 12; i++) {
      expect(result[i].items).toHaveLength(0);
    }
  });

  it("formats event items with dateStr, times, and description", () => {
    const events = [
      makeEvent({
        name: "Town Fair",
        date: jan15,
        startTime: "10:00 AM",
        endTime: "4:00 PM",
        description: "Annual fair",
      }),
    ];
    const result = buildEventExportMonthGroups(events, 2026, null);
    const item = result[0].items[0];
    expect(item.name).toBe("Town Fair");
    expect(item.dateStr).toContain("2026");
    expect(item.times).toBe("10:00 AM – 4:00 PM");
    expect(item.description).toBe("Annual fair");
  });

  it("uses em dash for empty description", () => {
    const events = [makeEvent({ name: "E", date: jan15 })];
    const result = buildEventExportMonthGroups(events, 2026, null);
    expect(result[0].items[0].description).toBe("—");
  });

  it("trims whitespace-only description to em dash", () => {
    const events = [
      makeEvent({ name: "E", date: jan15, description: "   " }),
    ];
    const result = buildEventExportMonthGroups(events, 2026, null);
    expect(result[0].items[0].description).toBe("—");
  });
});
