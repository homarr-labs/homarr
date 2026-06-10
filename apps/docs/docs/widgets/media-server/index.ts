import { WidgetDefinition } from '@site/src/types';
import { IconVideo } from '@tabler/icons-react';

export const mediaServerWidget: WidgetDefinition = {
  icon: IconVideo,
  name: 'Media server streams',
  description: 'Show the current streams on your media servers',
  path: '../../widgets/media-server',
  configuration: {
    items: [
      {
        name: 'Show only currently playing',
        description: 'Disabling this will not work for plex.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
