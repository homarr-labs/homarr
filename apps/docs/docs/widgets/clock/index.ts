import { WidgetDefinition } from '@site/src/types';
import { IconClock } from '@tabler/icons-react';

export const clockWidget: WidgetDefinition = {
  icon: IconClock,
  name: 'Date and time',
  description: 'Displays the current date and time.',
  path: '../../widgets/clock',
  configuration: {
    items: [
      {
        name: 'Custom Title/City display',
        description: 'Show off a custom title or the name of the city/country on top of the clock.',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Title',
        description:
          'Title shown on top of the widget. Only shown if "Custom Title/City display" is enabled.',
        values: { type: 'string' },
        defaultValue: '-',
      },
      {
        name: '24-hour format',
        description: 'Use 24-hour format instead of 12-hour format.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Display seconds',
        description: 'Whether to show seconds in the clock.',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Use fixed timezone',
        description: 'Select custom timezone to display instead of the client timezone.',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Timezone',
        description:
          'Choose the timezone following the IANA standard. Only shown if "Use fixed timezone" is enabled.',
        values: "Any IANA timezone, e.g. 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo'",
        defaultValue: 'Europe/London',
      },
      {
        name: 'Show the date',
        description: 'Whether to show the date below the clock.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Date format',
        description: 'Format of the date displayed below the clock.',
        values: "A collection of date formats, e.g. 'DD/MM/YYYY', 'MM/DD/YYYY', etc.",
        defaultValue: 'dddd, MMMM D',
      },
      {
        name: 'Custom time format',
        description: 'Format of the time displayed in the clock.',
        values: 'ISO 8601 format, e.g. "HH:mm:ss", "hh:mm A", etc.',
        defaultValue: '-',
      },
      {
        name: 'Custom date format',
        description: 'Format of the date displayed below the clock.',
        values: 'ISO 8601 format, e.g. "YYYY-MM-DD", "DD/MM/YYYY", etc.',
        defaultValue: '-',
      },
    ],
  },
};
