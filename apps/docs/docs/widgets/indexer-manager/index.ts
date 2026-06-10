import { WidgetDefinition } from '@site/src/types';
import { IconReportSearch } from '@tabler/icons-react';

export const indexerManagerWidget: WidgetDefinition = {
  icon: IconReportSearch,
  name: 'Indexer manager status',
  description: 'View the status of your indexers.',
  path: '../../widgets/indexer-manager',
  configuration: {
    items: [
      {
        name: 'Open in new tab',
        description: 'Open indexer site in new tab',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
