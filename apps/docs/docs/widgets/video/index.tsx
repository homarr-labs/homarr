import { WidgetDefinition } from '@site/src/types';
import { IconDeviceCctv } from '@tabler/icons-react';

export const videoWidget: WidgetDefinition = {
  icon: IconDeviceCctv,
  name: 'Video Stream',
  description: 'Embed a video stream or video from a camera or a website.',
  path: '../../widgets/stock-price',
  configuration: {
    items: [
      {
        name: 'Feed URL',
        description: 'The URL of the video feed or video file',
        defaultValue: '-',
        values: 'URL to video',
      },
      {
        name: 'Autoplay',
        description: 'Autoplay only works when muted because of browser restrictions',
        values: {
          type: 'boolean',
        },
        defaultValue: 'yes',
      },
      {
        name: 'Muted',
        description: 'Mute the video stream',
        values: {
          type: 'boolean',
        },
        defaultValue: 'yes',
      },
      {
        name: 'Show controls',
        description: 'Show video controls like play, pause, volume etc.',
        values: {
          type: 'boolean',
        },
        defaultValue: 'no',
      },
    ],
  },
};
