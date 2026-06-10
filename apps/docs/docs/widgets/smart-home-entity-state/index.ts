import { WidgetDefinition } from '@site/src/types';
import { IconBinaryTree } from '@tabler/icons-react';

export const smartHomeEntityStateWidget: WidgetDefinition = {
  icon: IconBinaryTree,
  name: 'Entity State',
  description: 'Display the state of an entity and toggle it optionally',
  path: '../../widgets/smart-home-entity-state',
  configuration: {
    items: [
      {
        name: 'Entity ID',
        description:
          'The ID of the entity to display. This can be any entity that is available in your smart home integration.',
        values: { type: 'string' },
        defaultValue: 'sun.sun',
      },
      {
        name: 'Display Name',
        description: 'Display name for the entity, if not set the entity ID will be used.',
        values: { type: 'string' },
        defaultValue: 'Sun',
      },
      {
        name: 'Entity unit',
        description: 'Optional unit for the entity (will be displayed after the value).',
        values: { type: 'string' },
        defaultValue: '',
      },
      {
        name: 'Clickable',
        description:
          'If enabled, the entity will be clickable and will toggle the state of the entity.',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
    ],
  },
};
