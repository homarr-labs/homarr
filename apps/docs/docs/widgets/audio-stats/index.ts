import { WidgetDefinition } from '@site/src/types';
import { IconHeadphones } from '@tabler/icons-react';

export const audioStatsWidget: WidgetDefinition = {
  icon: IconHeadphones,
  name: 'Audio Stats',
  description: 'Displays library statistics from Navidrome or Audiobookshelf, adapting its display based on the linked integration.',
  path: '../../widgets/audio-stats',
  configuration: {
    items: [
      {
        name: 'Show artists',
        description: 'Displays the artist count (Navidrome only)',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show albums',
        description: 'Displays the album count (Navidrome only)',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show songs',
        description: 'Displays the song count (Navidrome only)',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show now playing',
        description: 'Displays currently playing tracks (Navidrome only)',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show now playing list',
        description: 'Displays a detailed list of now playing tracks (Navidrome only)',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Max now playing items',
        description: 'Maximum number of now playing tracks to display (Navidrome only)',
        values: 'Number (1-5)',
        defaultValue: '3',
      },
      {
        name: 'Show library count',
        description: 'Displays the number of libraries (Audiobookshelf only)',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show audiobooks',
        description: 'Displays the total audiobook count (Audiobookshelf only)',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show podcasts',
        description: 'Displays the total podcast count (Audiobookshelf only)',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show listening time',
        description: 'Displays total listening time (Audiobookshelf only)',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show active sessions',
        description: 'Displays the number of active listening sessions (Audiobookshelf only)',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Compact mode',
        description: 'Uses a more compact layout with smaller icons and tighter spacing',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
    ],
  },
};
