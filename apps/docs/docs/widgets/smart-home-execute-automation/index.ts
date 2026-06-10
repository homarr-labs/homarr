import { WidgetDefinition } from '@site/src/types';
import { IconBinaryTree } from '@tabler/icons-react';

export const smartHomeExecuteAutomationWidget: WidgetDefinition = {
  icon: IconBinaryTree,
  name: 'Execute Automation',
  description: 'Trigger an automation with one click',
  path: '../../widgets/smart-home-execute-automation',
  configuration: {
    items: [
      {
        name: 'Display name',
        description: 'Title that will be displayed on the widget.',
        values: { type: 'string' },
        defaultValue: '-',
      },
      {
        name: 'Automation ID',
        description: 'The ID of the automation to execute.',
        values: { type: 'string' },
        defaultValue: '',
      },
    ],
  },
};
