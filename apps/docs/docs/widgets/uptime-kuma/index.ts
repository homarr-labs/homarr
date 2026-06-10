import { WidgetDefinition } from '@site/src/types';
import { IconHeartbeat } from '@tabler/icons-react';

export const uptimeKumaWidget: WidgetDefinition = {
  icon: IconHeartbeat,
  name: 'Uptime Kuma',
  description: 'Displays monitor uptime statistics, average uptime percentage, and service status counts.',
  path: '../../widgets/uptime-kuma',
  configuration: {
    items: [
      {
        name: 'Show average uptime',
        description: 'Displays the average uptime percentage across all monitors',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show uptime ring',
        description: 'Displays a ring progress indicator for average uptime',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show total monitors',
        description: 'Displays the total number of monitors',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show up count',
        description: 'Displays the number of monitors that are up',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show down count',
        description: 'Displays the number of monitors that are down',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show paused count',
        description: 'Displays the number of paused monitors',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
