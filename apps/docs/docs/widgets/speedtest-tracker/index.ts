import { WidgetDefinition } from '@site/src/types';
import { IconSpeedboat } from '@tabler/icons-react';

export const speedtestTrackerWidget: WidgetDefinition = {
  icon: IconSpeedboat,
  name: 'Speedtest Tracker',
  description: 'Displays speed test results from your Speedtest Tracker instance.',
  path: '../../widgets/speedtest-tracker',
  configuration: {
    items: [
      {
        name: 'Show latest result',
        description:
          'Displays the most recent speed test result, including download speed, upload speed, ping, and health status.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show averages',
        description:
          'Displays average download speed, upload speed, and ping across all recorded tests.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show recent results',
        description: 'Displays an area chart of the last 12 hours of speed test results.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show ping results',
        description:
          "Displays a chart of ping results. Only shown if 'Show recent results' is disabled.",
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
    ],
  },
};
