import type { WidgetDefinition } from "@site/src/types";
import { IconCalendarWeek } from "@tabler/icons-react";

export const todayWidget: WidgetDefinition = {
  icon: IconCalendarWeek,
  name: "Today",
  description: "Displays the current date and progress through the calendar.",
  path: "../../widgets/today",
  configuration: {
    items: [
      {
        name: "Week numbering",
        description: "Use locale-specific week numbering or ISO 8601 week numbers",
        values: { type: "select", options: ["Use locale rules", "ISO 8601"] },
        defaultValue: "Use locale rules",
      },
      {
        name: "Show week number",
        description: "Display the current week number when the widget has room",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show day of year",
        description: "Display the current day number within the year",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show quarter",
        description: "Display the current calendar quarter",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show year progress",
        description: "Display progress through the current year",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
