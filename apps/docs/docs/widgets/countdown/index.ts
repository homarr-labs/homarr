import { WidgetDefinition } from "@site/src/types";
import { IconHourglass } from "@tabler/icons-react";

export const countdownWidget: WidgetDefinition = {
  icon: IconHourglass,
  name: "Countdowns",
  description: "Tracks upcoming events and recurring anniversaries.",
  path: "../../widgets/countdown",
  configuration: {
    items: [
      {
        name: "Events",
        description: "Add, edit, and order one-time or yearly events with a date, time, and IANA timezone.",
        values: "Up to 20 events",
        defaultValue: "No events",
      },
      {
        name: "Show progress",
        description: "Show progress from an optional start date, or between yearly occurrences.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show seconds",
        description: "Keep seconds visible for every upcoming event, including events more than a day away.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
    ],
  },
};
