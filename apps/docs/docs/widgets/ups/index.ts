import { WidgetDefinition } from '@site/src/types';
import { IconBatteryCharging } from '@tabler/icons-react';

export const upsWidget: WidgetDefinition = {
  icon: IconBatteryCharging,
  name: 'UPS',
  description: 'Monitor the status of your UPS devices through a NUT server.',
  path: '../../widgets/ups',
  configuration: {
    items: [
      {
        name: 'Show battery',
        description: 'Displays the battery charge ring and estimated runtime for each UPS device.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show load',
        description: 'Displays the current output load percentage for each UPS device.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show voltage',
        description: 'Displays the input and output voltage for each UPS device.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
