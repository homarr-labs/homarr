import { WidgetDefinition } from '@site/src/types';
import { IconBusStop } from '@tabler/icons-react';

export const timetableWidget: WidgetDefinition = {
  icon: IconBusStop,
  name: 'Timetable',
  description: 'Displays departure times for a station.',
  path: '../../widgets/timetable',
  configuration: {
    items: [
      {
        name: 'Station',
        description: 'Select the station',
        values: 'List of station names',
        defaultValue: '-',
      },
    ],
  },
};
