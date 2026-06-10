import { WidgetDefinition } from '@site/src/types';
import { IconBrandDocker } from '@tabler/icons-react';

export const dockerContainersWidget: WidgetDefinition = {
  icon: IconBrandDocker,
  name: 'Docker stats',
  description: 'Stats of your containers',
  path: '../../widgets/docker-containers',
  configuration: {
    items: [
      {
        name: 'Enable items sorting',
        description: 'Allows to sort containers by clicking on the column headers',
        values: { type: 'boolean' },
        defaultValue: 'No',
      },
      {
        name: 'Column used for sorting by default',
        description:
          'Select which column to use for sorting the containers when the widget is loaded',
        values: {
          type: 'select',
          options: ['Name', 'State', 'CPU usage', 'Memory usage'],
        },
        defaultValue: 'Name',
      },
      {
        name: 'Invert sorting',
        description:
          'Invert the sorting order (ascending / descending) for the default sorting column',
        values: { type: 'boolean' },
        defaultValue: 'No',
      },
    ],
  },
};
