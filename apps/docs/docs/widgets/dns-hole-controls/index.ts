import { WidgetDefinition } from '@site/src/types';
import { IconDeviceGamepad } from '@tabler/icons-react';

export const dnsHoleControlsWidget: WidgetDefinition = {
  icon: IconDeviceGamepad,
  name: 'DNS Hole Controls',
  description: 'Control PiHole or AdGuard from your dashboard',
  path: '../../widgets/dns-hole-controls',
  configuration: {
    items: [
      {
        name: 'Show Toggle All Buttons',
        description:
          'Show or not the 2 buttons that may be redundant when having only one DNS-hole.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
