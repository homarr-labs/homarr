export const calendarViews = ["compact", "month", "week", "day", "agenda"] as const;
export type CalendarView = (typeof calendarViews)[number];

export const isCalendarView = (value: unknown): value is CalendarView => calendarViews.some((view) => view === value);
