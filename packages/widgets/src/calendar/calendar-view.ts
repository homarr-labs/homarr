export const calendarViews = ["compact", "month", "week", "day", "agenda"] as const;
export type CalendarView = (typeof calendarViews)[number];
