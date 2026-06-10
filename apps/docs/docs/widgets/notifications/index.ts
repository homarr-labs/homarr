import { WidgetDefinition } from '@site/src/types';
import { IconMessage } from '@tabler/icons-react';

export const notificationsWidget: WidgetDefinition = {
  icon: IconMessage,
  name: 'Notifications',
  description: 'Display notification history from an integration',
  path: '../../widgets/notifications',
  configuration: {
    items: [],
  },
};
