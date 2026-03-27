"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { Doc } from "../../../../convex/_generated/dataModel";
import type { EventClickArg } from "@fullcalendar/core";

interface EventCalendarProps {
  events: Doc<"events">[];
  onEventClick: (event: Doc<"events">) => void;
}

export function EventCalendar({ events, onEventClick }: EventCalendarProps) {
  const calendarEvents = events.map((event) => ({
    id: event._id,
    title: event.name,
    start: new Date(event.date),
    end: event.endDate ? new Date(event.endDate) : undefined,
  }));

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
