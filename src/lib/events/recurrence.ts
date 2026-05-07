import { format } from "date-fns";

export type EventScheduleType =
  | "SINGLE_DAY"
  | "DAILY_RANGE"
  | "MONTHLY_DAY"
  | "MONTHLY_ORDINAL_WEEKDAY";

export type EventOrdinal =
  | "EVERY"
  | "EVERY_OTHER"
  | "SECOND_AND_FOURTH"
  | "FIRST_THIRD_AND_FIFTH"
  | "FIRST"
  | "SECOND"
  | "THIRD"
  | "FOURTH"
  | "LAST";

export type EventMonthSelector = "EVERY" | "EVEN" | "ODD";

export type EventWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface RecurringEventLike {
  date: number;
  endDate?: number;
  isYearly?: boolean;
  scheduleType?: EventScheduleType;
  startsOn?: number;
  endsOn?: number;
  monthlyOrdinal?: EventOrdinal;
  monthlyWeekday?: EventWeekday;
  monthlyMonthSelector?: EventMonthSelector;
}

export interface EventOccurrence {
  date: number;
  marker?: "Start" | "End";
}

export const EVENT_SCHEDULE_TYPES: {
  value: EventScheduleType;
  label: string;
}[] = [
  { value: "SINGLE_DAY", label: "Single-Day Event" },
  { value: "DAILY_RANGE", label: "Every day between start and end" },
  { value: "MONTHLY_DAY", label: "On selected day(s) of each month" },
  {
    value: "MONTHLY_ORDINAL_WEEKDAY",
    label: "On selected weekday of selected months",
  },
];

export const EVENT_ORDINAL_OPTIONS: { value: EventOrdinal; label: string }[] = [
  { value: "EVERY", label: "every" },
  { value: "EVERY_OTHER", label: "every other" },
  { value: "SECOND_AND_FOURTH", label: "second and fourth" },
  { value: "FIRST_THIRD_AND_FIFTH", label: "first, third and fifth" },
  { value: "FIRST", label: "first" },
  { value: "SECOND", label: "second" },
  { value: "THIRD", label: "third" },
  { value: "FOURTH", label: "fourth" },
  { value: "LAST", label: "last" },
];

export const EVENT_WEEKDAY_OPTIONS: { value: EventWeekday; label: string }[] = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

export const EVENT_MONTH_SELECTOR_OPTIONS: {
  value: EventMonthSelector;
  label: string;
}[] = [
  { value: "EVERY", label: "every" },
  { value: "EVEN", label: "even (Feb, Apr, Jun, etc)" },
  { value: "ODD", label: "odd (Jan, Mar, May, etc)" },
];

const ORDINAL_LABELS = Object.fromEntries(
  EVENT_ORDINAL_OPTIONS.map((option) => [option.value, option.label])
) as Record<EventOrdinal, string>;

const WEEKDAY_LABELS = Object.fromEntries(
  EVENT_WEEKDAY_OPTIONS.map((option) => [option.value, option.label])
) as Record<EventWeekday, string>;

const MONTH_SELECTOR_LABELS: Record<EventMonthSelector, string> = {
  EVERY: "every month",
  EVEN: "even months",
  ODD: "odd months",
};

const WEEKDAY_TO_JS_DAY: Record<EventWeekday, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export const getEffectiveScheduleType = (
  event: RecurringEventLike
): EventScheduleType => {
  if (event.scheduleType) return event.scheduleType;
  return event.endDate && event.endDate !== event.date
    ? "DAILY_RANGE"
    : "SINGLE_DAY";
};

export const expandEventOccurrences = (
  event: RecurringEventLike,
  targetYear: number
): EventOccurrence[] => {
  const scheduleType = getEffectiveScheduleType(event);

  if (scheduleType === "SINGLE_DAY") {
    const occurrence = event.isYearly
      ? setYear(event.startsOn ?? event.date, targetYear)
      : event.startsOn ?? event.date;
    return new Date(occurrence).getFullYear() === targetYear
      ? [{ date: startOfLocalDay(occurrence).getTime() }]
      : [];
  }

  if (scheduleType === "DAILY_RANGE") {
    const startsOn = event.isYearly
      ? setYear(event.startsOn ?? event.date, targetYear)
      : event.startsOn ?? event.date;
    const endsOn = event.isYearly
      ? setYear(event.endsOn ?? event.endDate ?? event.date, targetYear)
      : event.endsOn ?? event.endDate ?? event.date;

    return expandDateRange(startsOn, endsOn).filter(
      (occurrence) => new Date(occurrence.date).getFullYear() === targetYear
    );
  }

  const startsOn = event.startsOn ?? new Date(targetYear, 0, 1).getTime();
  const endsOn = event.endsOn ?? new Date(targetYear, 11, 31).getTime();

  if (scheduleType === "MONTHLY_DAY") {
    return expandMonthlyDayOccurrences({
      startsOn,
      endsOn,
      ordinal: event.monthlyOrdinal ?? "FIRST",
      targetYear,
    });
  }

  if (!event.monthlyWeekday) return [];

  return expandMonthlyWeekdayOccurrences({
    startsOn,
    endsOn,
    ordinal: event.monthlyOrdinal ?? "FIRST",
    weekday: event.monthlyWeekday,
    monthSelector: event.monthlyMonthSelector ?? "EVERY",
    targetYear,
  });
};

export const formatEventSchedule = (
  event: RecurringEventLike,
  targetYear = new Date().getFullYear()
) => {
  const scheduleType = getEffectiveScheduleType(event);
  if (scheduleType === "SINGLE_DAY") {
    const occurrence = expandEventOccurrences(event, targetYear)[0];
    return occurrence ? format(occurrence.date, "MM/dd/yyyy") : "";
  }
  if (scheduleType === "DAILY_RANGE") {
    const occurrences = expandEventOccurrences(event, targetYear);
    if (!occurrences.length) return "";
    return `${format(occurrences[0].date, "MM/dd/yyyy")} - ${format(
      occurrences[occurrences.length - 1].date,
      "MM/dd/yyyy"
    )}`;
  }
  if (scheduleType === "MONTHLY_DAY") {
    return `${capitalize(
      ORDINAL_LABELS[event.monthlyOrdinal ?? "FIRST"]
    )} day(s) of each month`;
  }

  const ordinal = ORDINAL_LABELS[event.monthlyOrdinal ?? "FIRST"];
  const weekday = event.monthlyWeekday
    ? WEEKDAY_LABELS[event.monthlyWeekday]
    : "weekday";
  const months = MONTH_SELECTOR_LABELS[event.monthlyMonthSelector ?? "EVERY"];
  return `Every ${ordinal} ${weekday} of ${months}`;
};

const startOfLocalDay = (timestamp: number) => {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const setYear = (timestamp: number, year: number) => {
  const date = new Date(timestamp);
  return new Date(year, date.getMonth(), date.getDate()).getTime();
};

const expandDateRange = (startsOn: number, endsOn: number) => {
  const start = startOfLocalDay(startsOn);
  const end = startOfLocalDay(endsOn);
  if (start > end) return [];

  const occurrences: EventOccurrence[] = [];
  for (
    const current = new Date(start);
    current <= end;
    current.setDate(current.getDate() + 1)
  ) {
    const date = current.getTime();
    occurrences.push({
      date,
      marker:
        date === start.getTime()
          ? "Start"
          : date === end.getTime()
            ? "End"
            : undefined,
    });
  }
  return occurrences;
};

const expandMonthlyDayOccurrences = ({
  startsOn,
  endsOn,
  ordinal,
  targetYear,
}: {
  startsOn: number;
  endsOn: number;
  ordinal: EventOrdinal;
  targetYear: number;
}) => {
  const start = startOfLocalDay(startsOn);
  const end = startOfLocalDay(endsOn);
  const occurrences: EventOccurrence[] = [];

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(targetYear, month + 1, 0).getDate();
    for (const day of getOrdinalMonthDays(ordinal, daysInMonth)) {
      const date = new Date(targetYear, month, day);
      if (date >= start && date <= end) {
        occurrences.push({ date: date.getTime() });
      }
    }
  }

  return occurrences;
};

const expandMonthlyWeekdayOccurrences = ({
  startsOn,
  endsOn,
  ordinal,
  weekday,
  monthSelector,
  targetYear,
}: {
  startsOn: number;
  endsOn: number;
  ordinal: EventOrdinal;
  weekday: EventWeekday;
  monthSelector: EventMonthSelector;
  targetYear: number;
}) => {
  const start = startOfLocalDay(startsOn);
  const end = startOfLocalDay(endsOn);
  const occurrences: EventOccurrence[] = [];

  for (let month = 0; month < 12; month++) {
    const monthNumber = month + 1;
    if (!matchesMonthSelector(monthNumber, monthSelector)) continue;

    const matchingDays = getWeekdayMonthDays(targetYear, month, weekday);
    for (const day of selectOrdinalDays(matchingDays, ordinal)) {
      const date = new Date(targetYear, month, day);
      if (date >= start && date <= end) {
        occurrences.push({ date: date.getTime() });
      }
    }
  }

  return occurrences;
};

const matchesMonthSelector = (
  month: number,
  selector: EventMonthSelector
) => {
  if (selector === "EVEN") return month % 2 === 0;
  if (selector === "ODD") return month % 2 === 1;
  return true;
};

const getOrdinalMonthDays = (ordinal: EventOrdinal, daysInMonth: number) => {
  if (ordinal === "EVERY") {
    return Array.from({ length: daysInMonth }, (_, index) => index + 1);
  }
  if (ordinal === "EVERY_OTHER") {
    return Array.from({ length: daysInMonth }, (_, index) => index + 1).filter(
      (day) => day % 2 === 1
    );
  }
  if (ordinal === "SECOND_AND_FOURTH") return [2, 4];
  if (ordinal === "FIRST_THIRD_AND_FIFTH") return [1, 3, 5];
  if (ordinal === "LAST") return [daysInMonth];

  const ordinalDayMap = {
    FIRST: 1,
    SECOND: 2,
    THIRD: 3,
    FOURTH: 4,
  } satisfies Record<
    Exclude<
      EventOrdinal,
      | "EVERY"
      | "EVERY_OTHER"
      | "SECOND_AND_FOURTH"
      | "FIRST_THIRD_AND_FIFTH"
      | "LAST"
    >,
    number
  >;
  return [ordinalDayMap[ordinal]];
};

const getWeekdayMonthDays = (
  year: number,
  month: number,
  weekday: EventWeekday
) => {
  const jsDay = WEEKDAY_TO_JS_DAY[weekday];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: number[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    if (new Date(year, month, day).getDay() === jsDay) {
      days.push(day);
    }
  }

  return days;
};

const selectOrdinalDays = (days: number[], ordinal: EventOrdinal) => {
  if (ordinal === "EVERY") return days;
  if (ordinal === "EVERY_OTHER") {
    return days.filter((_, index) => index % 2 === 0);
  }
  if (ordinal === "SECOND_AND_FOURTH") {
    return [days[1], days[3]].filter((day): day is number => Boolean(day));
  }
  if (ordinal === "FIRST_THIRD_AND_FIFTH") {
    return [days[0], days[2], days[4]].filter((day): day is number =>
      Boolean(day)
    );
  }
  if (ordinal === "LAST") return days.length ? [days[days.length - 1]] : [];

  const ordinalIndexMap = {
    FIRST: 0,
    SECOND: 1,
    THIRD: 2,
    FOURTH: 3,
  } satisfies Record<
    Exclude<
      EventOrdinal,
      | "EVERY"
      | "EVERY_OTHER"
      | "SECOND_AND_FOURTH"
      | "FIRST_THIRD_AND_FIFTH"
      | "LAST"
    >,
    number
  >;
  const day = days[ordinalIndexMap[ordinal]];
  return day ? [day] : [];
};

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);
