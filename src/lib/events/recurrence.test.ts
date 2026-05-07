import { describe, expect, it } from "vitest";
import {
  expandEventOccurrences,
  formatEventSchedule,
  type RecurringEventLike,
} from "./recurrence";

const ts = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day).getTime();

const isoDates = (event: RecurringEventLike, year = 2026) =>
  expandEventOccurrences(event, year).map((occurrence) =>
    new Date(occurrence.date).toISOString().slice(0, 10)
  );

describe("event recurrence", () => {
  it("expands single-day yearly events into the target year", () => {
    expect(
      isoDates({
        date: ts(2026, 7, 4),
        startsOn: ts(2026, 7, 4),
        isYearly: true,
        scheduleType: "SINGLE_DAY",
      }, 2027)
    ).toEqual(["2027-07-04"]);
  });

  it("expands every day between start and end", () => {
    expect(
      isoDates({
        date: ts(2026, 5, 10),
        startsOn: ts(2026, 5, 10),
        endsOn: ts(2026, 5, 12),
        scheduleType: "DAILY_RANGE",
      })
    ).toEqual(["2026-05-10", "2026-05-11", "2026-05-12"]);
  });

  it("expands monthly day-of-month positions", () => {
    expect(
      isoDates({
        date: ts(2026, 4, 1),
        startsOn: ts(2026, 4, 1),
        endsOn: ts(2026, 4, 30),
        scheduleType: "MONTHLY_DAY",
        monthlyOrdinal: "FIRST_THIRD_AND_FIFTH",
      })
    ).toEqual(["2026-04-01", "2026-04-03", "2026-04-05"]);
  });

  it("expands monthly ordinal weekdays with month selectors", () => {
    expect(
      isoDates({
        date: ts(2026, 1, 1),
        startsOn: ts(2026, 1, 1),
        endsOn: ts(2026, 6, 30),
        scheduleType: "MONTHLY_ORDINAL_WEEKDAY",
        monthlyOrdinal: "FIRST",
        monthlyWeekday: "SUNDAY",
        monthlyMonthSelector: "EVEN",
      })
    ).toEqual(["2026-02-01", "2026-04-05", "2026-06-07"]);
  });

  it("honors leap-year last day of February", () => {
    expect(
      isoDates(
        {
          date: ts(2024, 2, 1),
          startsOn: ts(2024, 2, 1),
          endsOn: ts(2024, 2, 29),
          scheduleType: "MONTHLY_DAY",
          monthlyOrdinal: "LAST",
        },
        2024
      )
    ).toEqual(["2024-02-29"]);
  });

  it("formats schedule labels", () => {
    expect(
      formatEventSchedule({
        date: ts(2026, 1, 1),
        scheduleType: "MONTHLY_ORDINAL_WEEKDAY",
        monthlyOrdinal: "SECOND_AND_FOURTH",
        monthlyWeekday: "MONDAY",
        monthlyMonthSelector: "ODD",
      })
    ).toBe("Every second and fourth Monday of odd months");
  });
});
