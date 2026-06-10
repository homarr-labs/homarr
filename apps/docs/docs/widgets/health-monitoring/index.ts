import { WidgetDefinition } from '@site/src/types';
import { IconHeartRateMonitor } from '@tabler/icons-react';

export const healthMonitoringWidget: WidgetDefinition = {
  icon: IconHeartRateMonitor,
  name: 'System Health Monitoring',
  description: 'Displays information showing the health and status of your system(s).',
  path: '../../widgets/health-monitoring',
  configuration: {
    items: [
      {
        name: 'CPU Temp in Fahrenheit',
        description: 'Display the CPU temperature in Fahrenheit or Celsius',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Show CPU Info',
        description: 'Displays CPU info in the system tab',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show Memory Info',
        description: 'Displays memory info in the system tab',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show Uptime',
        description: 'Show uptime in the cluster tab',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show Filesystem Info',
        description: 'Displays filesystem info in the system tab',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Default tab',
        description:
          'Tab that should be visible by default. Only used when multiple integrations are available.',
        values: {
          type: 'select',
          options: ['System', 'Cluster'],
        },
        defaultValue: 'System',
      },
      {
        name: 'Visible cluster sections',
        description: 'Select which sections should be visible in the cluster tab',
        values: 'List of Nodes, VMs, LXCs, Storage',
        defaultValue: 'Nodes, VMs, LXCs, Storage',
      },
      {
        name: 'Section indicator requirement',
        description:
          "'All' requires that all items be online for the indicator to be green. 'Any' requires at least one item to be online.",
        values: {
          type: 'select',
          options: ['All', 'Any'],
        },
        defaultValue: 'All',
      },
    ],
  },
};
