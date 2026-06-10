import { WidgetDefinition } from '@site/src/types';
import { IconNotes } from '@tabler/icons-react';

export const anchorNoteWidget: WidgetDefinition = {
  icon: IconNotes,
  name: 'Anchor Note',
  description: 'Display and edit a selected note from Anchor',
  path: '../../widgets/anchor-note',
  configuration: {
    items: [
      {
        name: 'Note',
        description: 'Select the note from your Anchor integration to display in the widget.',
        values: 'One of the notes from your Anchor integration',
        defaultValue: '-',
      },
      {
        name: 'Show title',
        description: 'Show the note title at the top of the widget.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show last updated',
        description: 'Show the relative last updated time of the note.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
    ],
  },
};
