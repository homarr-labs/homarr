import { WidgetDefinition } from '@site/src/types';
import { IconFileText } from '@tabler/icons-react';

export const paperlessNgxWidget: WidgetDefinition = {
  icon: IconFileText,
  name: 'Paperless-ngx',
  description: 'Displays document management statistics including inbox ratio, document counts, and metadata.',
  path: '../../widgets/paperless-ngx',
  configuration: {
    items: [
      {
        name: 'Show inbox ratio',
        description: 'Displays the inbox-to-total documents ratio as a hero section',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show inbox ring',
        description: 'Displays a ring progress indicator for the inbox ratio',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show documents total',
        description: 'Displays the total number of documents',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show documents inbox',
        description: 'Displays the number of documents in the inbox',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show correspondents',
        description: 'Displays the number of correspondents',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show tags',
        description: 'Displays the number of tags',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show document types',
        description: 'Displays the number of document types',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
