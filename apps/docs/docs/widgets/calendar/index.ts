import { WidgetDefinition } from '@site/src/types';
import { IconCalendar } from '@tabler/icons-react';

export const calendarWidget: WidgetDefinition = {
  icon: IconCalendar,
  name: 'Calendar',
  description:
    'Display events from your integrations in a calendar view within a certain relative time period',
  path: '../../widgets/calendar',
  configuration: {
    items: [
      {
        name: 'Radarr release type',
        description: 'Select what type of release date to see.',
        values: "List of: 'In cinemas', 'Digital release', 'Physical release'",
        defaultValue: "'In cinemas' and 'Digital release'",
      },
      {
        name: 'Start from',
        description:
          'Amount of months in past that Homarr should load in background. Higher number means more memory usage.',
        values: '2-9999',
        defaultValue: '2',
      },
      {
        name: 'End at',
        description:
          'Amount of months in future that Homarr should load in background. Higher number means more memory usage.',
        values: '2-9999',
        defaultValue: '2',
      },
      {
        name: 'Show unmonitored',
        description: 'Whether to show releases that are not monitored in the integration.',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
    ],
  },
};
