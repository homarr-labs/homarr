import { WidgetDefinition } from '@site/src/types';
import { IconPhoto } from '@tabler/icons-react';

export const immichAlbumCarouselWidget: WidgetDefinition = {
  icon: IconPhoto,
  name: 'Immich Album',
  description: 'Shows a slideshow of your album pictures from Immich',
  path: '../../widgets/immich-album-carousel',
  configuration: {
    items: [
      {
        name: 'Album ID',
        description:
          "This is a unique ID which refers to your Immich album. You can find this id by opening an album and copying the unique string from the URL, for example 'a21aca09-9f05-47dc-b1a1-7b53c547226e'",
        values: { type: 'string' },
        defaultValue: '',
      },
      {
        name: 'Interval in seconds',
        description:
          'Rotate between pictures in the album every X seconds. Must be at least 1. Must be below 3600',
        values: { type: 'string' },
        defaultValue: '',
      },
      {
        name: 'Show photo info',
        description:
          'Display date of the picture and the current index at the bottom of the slideshow',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
