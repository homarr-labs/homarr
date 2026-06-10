import { WidgetDefinition } from '@site/src/types';
import { IconTransform } from '@tabler/icons-react';

export const mediaTranscodingWidget: WidgetDefinition = {
  icon: IconTransform,
  name: 'Media transcoding',
  description: 'Statistics, current queue and worker status of your media transcoding',
  path: '../../widgets/media-transcoding',
  configuration: {
    items: [
      {
        name: 'Default view',
        description: 'Tab that is shown by default when the widget is opened',
        values: { type: 'select', options: ['Queue', 'Workers', 'Statistics'] },
        defaultValue: 'Statistics',
      },
      {
        name: 'Queue page size',
        description: 'Number of items shown per page in the queue',
        values: '1-30',
        defaultValue: '10',
      },
    ],
  },
};
