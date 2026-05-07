"use client";

import { useState, useMemo, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  isWithinInterval,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { expandEventOccurrences } from "@/lib/events/recurrence";

interface CalendarEvent {
  _id: string;
  name: string;
  date: number;
  endDate?: number;
  isYearly?: boolean;
  scheduleType?:
    | "SINGLE_DAY"
    | "DAILY_RANGE"
    | "MONTHLY_DAY"
    | "MONTHLY_ORDINAL_WEEKDAY";
  startsOn?: number;
  endsOn?: number;
  monthlyOrdinal?:
    | "EVERY"
    | "EVERY_OTHER"
    | "SECOND_AND_FOURTH"
    | "FIRST_THIRD_AND_FIFTH"
    | "FIRST"
    | "SECOND"
    | "THIRD"
    | "FOURTH"
    | "LAST";
  monthlyWeekday?:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";
  monthlyMonthSelector?: "EVERY" | "EVEN" | "ODD";
}

interface EventCalendarProps {
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  selectedDate?: Date | null;
  onMonthChange?: (date: Date) => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function EventCalendar({
  events,
  onDateClick,
  selectedDate,
  onMonthChange,
}: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const years = new Set([
        currentMonth.getFullYear(),
        new Date(event.date).getFullYear(),
      ]);

      for (const year of years) {
        for (const occurrence of expandEventOccurrences(event, year)) {
          const occurrenceDate = new Date(occurrence.date);
          if (
            !isWithinInterval(occurrenceDate, {
              start: startOfMonth(currentMonth),
              end: endOfMonth(currentMonth),
            })
          ) {
            continue;
          }

          const key = format(occurrenceDate, "yyyy-MM-dd");
          const existing = map.get(key);
          if (existing) {
            existing.push(event);
          } else {
            map.set(key, [event]);
          }
        }
      }
    }
    return map;
  }, [currentMonth, events]);

  const navigate = useCallback(
    (direction: "prev" | "next") => {
      setCurrentMonth((m) => {
        const next =
          direction === "prev" ? subMonths(m, 1) : addMonths(m, 1);
        onMonthChange?.(next);
        return next;
      });
    },
    [onMonthChange],
  );

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body editorial-shadow rounded-lg overflow-hidden ring-0">
      {/* Header */}
      <div className="bg-surface-container-low flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-on-surface hover:bg-surface-container"
          onClick={() => navigate("prev")}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Previous month</span>
        </Button>
        <h2 className="font-headline text-base italic">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-on-surface hover:bg-surface-container"
          onClick={() => navigate("next")}
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Next month</span>
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="bg-surface-container-low grid grid-cols-7 border-b border-surface-container-highest">
        {WEEKDAY_LABELS.map((day) => (
          <div
            key={day}
            className="text-on-surface/60 py-2 text-center text-xs font-medium"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(dateKey);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onDateClick(day)}
              className={cn(
                "border-surface-container-highest relative flex min-h-16 flex-col items-center border-b border-r p-1.5 transition-colors hover:bg-surface-container md:min-h-20",
                !inMonth && "bg-surface-container-low/80 text-on-surface/45",
                selected && "bg-surface-container ring-1 ring-inset ring-primary/35",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm",
                  today && "bg-primary font-semibold text-primary-foreground",
                  selected && !today && "bg-surface-container-high font-semibold text-on-surface",
                )}
              >
                {format(day, "d")}
              </span>

              {dayEvents && dayEvents.length > 0 && (
                <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                  {dayEvents.slice(0, 3).map((evt) => (
                    <span
                      key={evt._id}
                      className="size-1.5 rounded-full bg-primary"
                      title={evt.name}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-on-surface/60 text-[10px] leading-none">
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
