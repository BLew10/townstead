import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";
import { expandEventOccurrences } from "@/lib/events/recurrence";
import React from "react";

Font.registerHyphenationCallback((word) => [word]);

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_HEADERS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const PALETTE = {
  border: "#d6d3cd",
  monthHeaderBg: "#c8e6dc",
  dayHeaderBg: "#e9e2c0",
  ink: "#1a1a1a",
  mutedInk: "#4a4a4a",
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    color: PALETTE.ink,
    fontSize: 10,
  },
  monthHeader: {
    backgroundColor: PALETTE.monthHeaderBg,
    paddingVertical: 7,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  editionInfo: {
    position: "absolute",
    left: 14,
    top: 9,
    fontSize: 9,
    fontStyle: "italic",
    color: PALETTE.mutedInk,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.4,
  },
  grid: {
    flexGrow: 1,
    flexDirection: "column",
  },
  dayHeaderRow: {
    flexDirection: "row",
    backgroundColor: PALETTE.dayHeaderBg,
    borderTopWidth: 0.5,
    borderTopColor: PALETTE.border,
  },
  dayHeaderCell: {
    flex: 1,
    paddingVertical: 4,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "bold",
    borderRightWidth: 0.5,
    borderRightColor: PALETTE.border,
  },
  dayHeaderCellLast: {
    borderRightWidth: 0,
  },
  weekRow: {
    flexDirection: "row",
    flexGrow: 1,
    borderTopWidth: 0.5,
    borderTopColor: PALETTE.border,
  },
  dayCell: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: PALETTE.border,
    padding: 4,
    position: "relative",
  },
  dayCellLast: {
    borderRightWidth: 0,
  },
  dayNumber: {
    position: "absolute",
    top: 3,
    right: 5,
    fontSize: 11,
    fontWeight: "bold",
  },
  eventsList: {
    marginTop: 14,
    paddingRight: 2,
  },
  eventItem: {
    fontSize: 8,
    lineHeight: 1.2,
    marginBottom: 1,
  },
  splitDayCell: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: PALETTE.border,
    flexDirection: "column",
    padding: 0,
  },
  splitHalf: {
    flex: 1,
    padding: 4,
    position: "relative",
  },
  splitHalfTop: {
    borderBottomWidth: 0.5,
    borderBottomColor: PALETTE.border,
  },
  splitDayNumber: {
    position: "absolute",
    top: 2,
    right: 4,
    fontSize: 9,
    fontWeight: "bold",
  },
  splitEventItem: {
    fontSize: 7,
    lineHeight: 1.15,
    marginBottom: 0.5,
    marginTop: 10,
  },
});

type CalendarDayCell = {
  day: number | null;
  events: string[];
};

function buildMonthCells(
  year: number,
  monthIndex: number,
  events: Doc<"events">[]
): { cells: CalendarDayCell[]; needsSplit: boolean } {
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const eventNamesByDay = new Map<number, string[]>();
  for (const event of events) {
    const occurrences = expandEventOccurrences(event, year);
    for (const occ of occurrences) {
      const d = new Date(occ.date);
      if (d.getFullYear() !== year || d.getMonth() !== monthIndex) continue;
      const day = d.getDate();
      if (!eventNamesByDay.has(day)) eventNamesByDay.set(day, []);
      eventNamesByDay.get(day)!.push(event.name);
    }
  }

  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null, events: [] });
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, events: eventNamesByDay.get(day) ?? [] });
  }
  // Pad to multiple of 7
  while (cells.length % 7 !== 0) cells.push({ day: null, events: [] });

  const needsSplit = cells.length > 35;
  return { cells, needsSplit };
}

function DayCell({
  cell,
  isLast,
}: {
  cell: CalendarDayCell;
  isLast: boolean;
}) {
  return (
    <View style={[styles.dayCell, isLast ? styles.dayCellLast : {}]}>
      {cell.day !== null && (
        <>
          <Text style={styles.dayNumber}>{cell.day}</Text>
          {cell.events.length > 0 && (
            <View style={styles.eventsList}>
              {cell.events.map((name, idx) => (
                <Text key={idx} style={styles.eventItem}>
                  • {name}
                </Text>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function SplitDayCell({
  topCell,
  bottomCell,
  isLast,
}: {
  topCell: CalendarDayCell;
  bottomCell: CalendarDayCell;
  isLast: boolean;
}) {
  const renderHalf = (cell: CalendarDayCell, isTop: boolean) => (
    <View style={[styles.splitHalf, isTop ? styles.splitHalfTop : {}]}>
      {cell.day !== null && (
        <>
          <Text style={styles.splitDayNumber}>{cell.day}</Text>
          {cell.events.slice(0, 3).map((name, idx) => (
            <Text key={idx} style={styles.splitEventItem}>
              • {name}
            </Text>
          ))}
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.splitDayCell, isLast ? styles.dayCellLast : {}]}>
      {renderHalf(topCell, true)}
      {renderHalf(bottomCell, false)}
    </View>
  );
}

function MonthPage({
  year,
  monthIndex,
  editionLabel,
  events,
}: {
  year: number;
  monthIndex: number;
  editionLabel: string;
  events: Doc<"events">[];
}) {
  const { cells, needsSplit } = buildMonthCells(year, monthIndex, events);
  const completeRows = needsSplit ? 4 : 5;
  const rows: CalendarDayCell[][] = [];
  for (let r = 0; r < completeRows; r++) {
    rows.push(cells.slice(r * 7, r * 7 + 7));
  }

  return (
    <Page size="LETTER" orientation="landscape" style={styles.page}>
      <View style={styles.monthHeader}>
        <Text style={styles.editionInfo}>
          {year} {editionLabel}
        </Text>
        <Text style={styles.monthTitle}>
          {MONTH_NAMES[monthIndex]} {year}
        </Text>
      </View>
      <View style={styles.grid}>
        <View style={styles.dayHeaderRow}>
          {DAY_HEADERS.map((d, idx) => (
            <Text
              key={d}
              style={[
                styles.dayHeaderCell,
                idx === 6 ? styles.dayHeaderCellLast : {},
              ]}
            >
              {d}
            </Text>
          ))}
        </View>
        {rows.map((row, rIdx) => (
          <View key={rIdx} style={styles.weekRow}>
            {row.map((cell, cIdx) => (
              <DayCell
                key={cIdx}
                cell={cell}
                isLast={cIdx === 6}
              />
            ))}
          </View>
        ))}
        {needsSplit && (
          <View style={styles.weekRow}>
            {Array.from({ length: 7 }).map((_, cIdx) => {
              const top = cells[28 + cIdx] ?? { day: null, events: [] };
              const bottom = cells[35 + cIdx] ?? { day: null, events: [] };
              return (
                <SplitDayCell
                  key={cIdx}
                  topCell={top}
                  bottomCell={bottom}
                  isLast={cIdx === 6}
                />
              );
            })}
          </View>
        )}
      </View>
    </Page>
  );
}

export type CalendarPdfInput = {
  year: number;
  events: Doc<"events">[];
  editionLabel?: string;
  calendarEditionId?: Id<"calendarEditions"> | null;
};

export async function generateCalendarPdf(
  input: CalendarPdfInput
): Promise<Buffer> {
  const editionLabel = input.editionLabel ?? "Community Calendar";
  const events = input.calendarEditionId
    ? input.events.filter((e) =>
        (e.calendarEditionIds ?? []).includes(input.calendarEditionId!)
      )
    : input.events;

  const doc = (
    <Document
      title={`${editionLabel} ${input.year}`}
      author="Townstead"
      creator="Townstead"
      producer="Townstead"
    >
      {MONTH_NAMES.map((_, monthIndex) => (
        <MonthPage
          key={monthIndex}
          year={input.year}
          monthIndex={monthIndex}
          editionLabel={editionLabel}
          events={events}
        />
      ))}
    </Document>
  );

  return renderToBuffer(doc);
}
