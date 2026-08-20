import { WidgetDefinition } from "@site/src/types";
import { IconClock } from "@tabler/icons-react";

export const clockWidget: WidgetDefinition = {
  icon: IconClock,
  name: "Date and time",
  description: "Displays the current date and time.",
  path: "../../widgets/clock",
  configuration: {
    items: [
      {
        name: "Custom Title/City display",
        description: "Show off a custom title or the name of the city/country on top of the clock.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Title",
        description: 'Title shown on top of the widget. Only shown if "Custom Title/City display" is enabled.',
        values: { type: "string" },
        defaultValue: "-",
      },
      {
        name: "Use fixed timezone",
        description: "Select custom timezone to display instead of the client timezone.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Timezone",
        description: 'Choose the timezone following the IANA standard. Only shown if "Use fixed timezone" is enabled.',
        values: "Any IANA timezone, e.g. 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo'",
        defaultValue: "Europe/London",
      },
      {
        name: "Show the date",
        description: "Whether to show the date below the clock.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Date format",
        description: "Choose a common Day.js date format with a live example and its tokens.",
        values: "YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, or common long and short date formats",
        defaultValue: "dddd, MMMM D",
      },
      {
        name: "Time format",
        description:
          "Choose a common Day.js time format with a live example. The format controls 12/24-hour display and seconds.",
        values: "HH:mm, HH:mm:ss, h:mm A, or h:mm:ss A",
        defaultValue: "HH:mm",
      },
      {
        name: "Show weather",
        description: "Show a compact weather summary from an independently configured location.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Weather location",
        description: 'Location used by the weather summary. Only shown if "Show weather" is enabled.',
        values: "A searched city or custom latitude and longitude",
        defaultValue: "Brisbane",
      },
      {
        name: "Use Fahrenheit",
        description: 'Use Fahrenheit in the weather summary. Only shown if "Show weather" is enabled.',
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Animate weather icon",
        description: "Animate the weather icon unless the device requests reduced motion.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "World clock cities",
        description: "Add, label, and order up to six IANA timezones for advanced view.",
        values: "Up to six labeled IANA timezones",
        defaultValue: "New York, Paris, and Tokyo",
      },
    ],
  },
};
