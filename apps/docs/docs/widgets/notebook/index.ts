import { WidgetDefinition } from '@site/src/types';
import { IconNotes } from '@tabler/icons-react';

export const notebookWidget: WidgetDefinition = {
  icon: IconNotes,
  name: 'Notebook',
  description: 'A simple notebook widget that supports markdown.',
  path: '../../widgets/notebook',
  configuration: {
    items: [
      {
        name: 'Show the toolbar to help you write markdown',
        description: 'Upon editing, enables a toolbar at the top with document editing functions.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Allow check in read only mode',
        description: 'Allows the ability to check the boxes from checklists outside of editing',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
