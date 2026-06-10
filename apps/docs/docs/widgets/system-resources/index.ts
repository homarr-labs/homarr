import { WidgetDefinition } from '@site/src/types';
import { IconGraph } from '@tabler/icons-react';

export const systemResourcesWidget: WidgetDefinition = {
  icon: IconGraph,
  name: 'System Resources',
  description: 'Displays CPU, RAM and network of your host',
  path: '../../widgets/system-resources',
  configuration: {
    items: [
      {
        name: 'Visible charts',
        description: 'Select the charts you want to be visible.',
        values: {
          type: 'select',
          options: ['CPU', 'Memory', 'Network'],
        },
        defaultValue: 'CPU, Memory, Network',
      },
      {
        name: 'Label display mode',
        description: 'Select how the graphs should be labeled',
        values: {
          type: 'select',
          options: ['Show text with icon', 'Show only text', 'Show only icon', 'Hide label'],
        },
        defaultValue: 'Show text with icon',
      },
      {
        name: 'Enable chart shading',
        description: 'Not only show a line, but also fill the area below',
        values: {
          type: 'boolean',
        },
        defaultValue: 'Yes',
      },
    ],
  },
};
