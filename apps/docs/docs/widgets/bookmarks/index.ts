import { WidgetDefinition } from '@site/src/types';
import { IconBookmark } from '@tabler/icons-react';

export const bookmarksWidget: WidgetDefinition = {
  icon: IconBookmark,
  name: 'Bookmarks',
  description: 'Displays multiple app links',
  path: '../../widgets/bookmarks',
  configuration: {
    items: [
      {
        name: 'Title',
        description: 'Title shown on top of the widget.',
        values: { type: 'string' },
        defaultValue: '-',
      },
      {
        name: 'Layout',
        description: 'Layout in which the bookmarks are displayed.',
        values: { type: 'select', options: ['Vertical', 'Horizontal', 'Grid', 'Grid horizontal'] },
        defaultValue: 'Vertical',
      },
      {
        name: 'Hide title',
        description: 'Whether to hide the title of the bookmark items.',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Hide icons',
        description: 'Whether to hide the icon of the bookmark items.',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Hide hostnames',
        description: 'Whether to hide the hostname of the bookmark items.',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Open in new tab',
        description: 'Whether to open the bookmark items in a new tab.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Bookmarks',
        description: 'List of bookmarks to display in the widget.',
        values: 'Select of all your apps and order them as you like.',
        defaultValue: 'No bookmarks selected',
      },
    ],
  },
};
