import { WidgetDefinition } from '@site/src/types';
import { IconZoomQuestion } from '@tabler/icons-react';

export const mediaRequestListWidget: WidgetDefinition = {
  icon: IconZoomQuestion,
  name: 'Media Request List',
  description: 'See a list of all media requests from your integration',
  path: '../../widgets/media-request-list',
  configuration: {
    items: [
      {
        name: 'Open links in new tab',
        description: 'If enabled, links will open in a new tab.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
