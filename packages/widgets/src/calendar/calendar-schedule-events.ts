import dayjs from "dayjs";
import type { ScheduleEventData } from "@mantine/schedule";

import type { CalendarEventWithSource } from "./calendar-event-list";

export const isCalendarAllDayEvent = (event: CalendarEventWithSource) => {
  const start = dayjs(event.startDate);
  if (!start.isSame(start.startOf("day"))) return false;
  if (!event.endDate) return true;
  const end = dayjs(event.endDate);
  return end.isSame(end.startOf("day")) || end.isSame(end.endOf("day"));
};

export const getCalendarScheduleEvents = (
  events: CalendarEventWithSource[],
  displayedDay?: Date,
): ScheduleEventData[] => {
  const dayStart = displayedDay ? dayjs(displayedDay).startOf("day") : undefined;
  const dayEnd = dayStart?.add(1, "day").startOf("day");
  return events.flatMap((event, index) => {
    let start = dayjs(event.startDate);
    if (!start.isValid()) return [];
    let end = start.add(30, "minute");
    if (event.endDate) end = dayjs(event.endDate);
    else if (isCalendarAllDayEvent(event)) end = start.add(1, "day");
    if (!end.isValid() || end.isBefore(start)) return [];
    if (end.isSame(start)) end = start.add(30, "minute");
    // The schedule uses half-open intervals and second precision.
    if (isCalendarAllDayEvent(event) && end.isSame(end.endOf("day"))) end = end.add(1, "millisecond");
    if (dayStart && dayEnd) {
      if (!start.isBefore(dayEnd) || !end.isAfter(dayStart)) return [];
      if (start.isBefore(dayStart)) start = dayStart;
      if (!end.isBefore(dayEnd)) end = dayEnd.subtract(1, "second");
    }
    return [
      {
        id: `${event.source?.integrationId ?? "calendar"}:${index}`,
        title: event.title,
        start: start.format("YYYY-MM-DD HH:mm:ss"),
        end: end.format("YYYY-MM-DD HH:mm:ss"),
        color: event.indicatorColor ?? "blue",
        payload: { event },
      },
    ];
  });
};
