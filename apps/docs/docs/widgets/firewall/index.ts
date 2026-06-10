import { WidgetDefinition } from '@site/src/types';
import { IconWall } from '@tabler/icons-react';

export const firewallWidget: WidgetDefinition = {
  icon: IconWall,
  name: 'Firewall Monitoring',
  description: 'Displays a summary of firewalls.',
  path: '../../widgets/firewall',
  configuration: {
    items: [],
  },
};
