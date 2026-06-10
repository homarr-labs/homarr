import { WidgetDefinition } from '@site/src/types';
import { IconActivity } from '@tabler/icons-react';

export const tracearrWidget: WidgetDefinition = {
  icon: IconActivity,
  name: 'Tracearr',
  description: 'Monitor media server streams, user activity, and policy violations.',
  path: '../../widgets/tracearr',
  configuration: {
    items: [
      {
        name: 'Show Streams',
        description: 'Display the active streams section.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show Stats',
        description: 'Display the stats bar with active streams, total users, transcode count, and bandwidth.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show Recent Activity',
        description: 'Display the recent activity list with user watch history.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show Violations',
        description: 'Display the violations alerts for policy breaches.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
