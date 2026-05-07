"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { Doc } from "../../../../convex/_generated/dataModel";
import type { EventClickArg } from "@fullcalendar/core";
import { expandEventOccurrences } from "@/lib/events/recurrence";

interface EventCalendarProps {
  events: Doc<"events">[];
  onEventClick: (event: Doc<"events">) => void;
}

export function EventCalendar({ events, onEventClick }: EventCalendarProps) {
  const visibleYears = new Set(
    events.map((event) => new Date(event.date).getFullYear())
  );
  visibleYears.add(new Date().getFullYear());

  const calendarEvents = events.flatMap((event) =>
    Array.from(visibleYears).flatMap((year) =>
      expandEventOccurrences(event, year).map((occurrence) => ({
        id: event._id,
        title: event.name,
        start: new Date(occurrence.date),
      }))
    )
  );

  const handleEventClick = (info: EventClickArg) => {
    const matched = events.find((e) => e._id === info.event.id);
    if (matched) onEventClick(matched);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={calendarEvents}
        eventClick={handleEventClick}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
        height="auto"
      />
    </div>
  );
}
