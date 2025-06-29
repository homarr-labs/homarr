import type { CalendarEvent } from "../../types";

export interface CalendarIntegration {
  getCalendarEventsAsync(start: Date, end: Date, includeUnmonitored: boolean): Promise<CalendarEvent[]>;
}
