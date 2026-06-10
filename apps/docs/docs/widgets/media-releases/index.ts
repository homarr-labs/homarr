import { WidgetDefinition } from '@site/src/types';
import { IconTicket } from '@tabler/icons-react';

export const mediaReleasesWidget: WidgetDefinition = {
  icon: IconTicket,
  name: 'Media releases',
  description: 'Display newly added medias or upcoming releases from different integrations',
  path: '../../widgets/media-releases',
  configuration: {
    items: [
      {
        name: 'Layout',
        description: 'How the image should be displayed',
        values: {
          type: 'select',
          options: ['Backdrop', 'Poster'],
        },
        defaultValue: 'Backdrop',
      },
      {
        name: 'Show description tooltip',
        description:
          'Show a tooltip with the description of the media when hovering over the media item',
        values: {
          type: 'boolean',
        },
        defaultValue: 'true',
      },
      {
        name: 'Show media type badge',
        description: 'Show a badge indicating the type of media (e.g., movie, series)',
        values: {
          type: 'boolean',
        },
        defaultValue: 'true',
      },
      {
        name: 'Show source integration',
        description: 'Show avatar of the source integration',
        values: {
          type: 'boolean',
        },
        defaultValue: 'true',
      },
    ],
  },
};
