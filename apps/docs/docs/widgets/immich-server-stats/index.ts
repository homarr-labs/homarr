import { WidgetDefinition } from '@site/src/types';
import { IconGraph } from '@tabler/icons-react';

export const immichServerStatsWidget: WidgetDefinition = {
  icon: IconGraph,
  name: 'Immich Server Stats',
  description: 'Information about your Immich instance',
  path: '../../widgets/immich-server-stats',
  configuration: {
    items: [
      {
        name: 'Show users',
        description: 'Show count of users on your instance',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show photos',
        description: 'Show count of photos on your instance',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show videos',
        description: 'Show count of videos on your instance',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show storage',
        description: 'Show the total amount of storage used',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
