import { WidgetDefinition } from '@site/src/types';
import { IconCloud } from '@tabler/icons-react';

export const coolifyWidget: WidgetDefinition = {
  icon: IconCloud,
  name: 'Coolify',
  description: 'Overview of your Coolify instance with servers, applications, and services.',
  path: '../../widgets/coolify',
  configuration: {
    items: [
      {
        name: 'Show servers',
        description: 'Display the servers section with reachability status and resource counts.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show applications',
        description:
          'Display the applications section with status, project, environment, and links.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show services',
        description: 'Display the services section with status, project, environment, and links.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
