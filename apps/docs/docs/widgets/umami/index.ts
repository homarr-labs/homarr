import { WidgetDefinition } from '@site/src/types';
import { IconChartBar } from '@tabler/icons-react';

export const umamiWidget: WidgetDefinition = {
  icon: IconChartBar,
  name: 'Umami Analytics',
  description: 'Display visitor stats from your Umami analytics instance',
  path: '../../widgets/umami',
  configuration: {
    items: [
      {
        name: 'Website',
        description: 'Select a website tracked by your Umami instance. Populated automatically from the connected integration.',
        values: 'Website selector',
        defaultValue: 'None',
      },
      {
        name: 'Time frame',
        description: 'The time period to display visitor data for',
        values: {
          type: 'select',
          options: ['Today', 'Last 24 hours', 'Last 7 days', 'Last 30 days', 'This month', 'Last month'],
        },
        defaultValue: 'Last 24 hours',
      },
      {
        name: 'View',
        description: 'What to display in the widget body. Visible once a website is selected.',
        values: {
          type: 'select',
          options: ['Chart', 'Events chart', 'Top pages', 'Top referrers'],
        },
        defaultValue: 'Chart',
      },
      {
        name: 'Chart type',
        description: 'Display style for the chart. Visible when View is "Chart" or "Events chart".',
        values: {
          type: 'select',
          options: ['Bar chart', 'Sparkline'],
        },
        defaultValue: 'Bar chart',
      },
      {
        name: 'Chart style',
        description: 'How to render the event series alongside visitors. Visible when View is "Chart", Chart type is "Bar chart", and an Event is selected.',
        values: {
          type: 'select',
          options: ['Side by side', 'Overlay (subset)'],
        },
        defaultValue: 'Side by side',
      },
      {
        name: 'Event',
        description: 'Overlay a single named event on the visitor chart. Populated from event names recorded by Umami. Visible when View is "Chart".',
        values: 'Event name selector',
        defaultValue: 'None',
      },
      {
        name: 'Events',
        description: 'Select one or more events to plot as individual series with no visitors baseline. Populated from event names recorded by Umami. Visible when View is "Events chart".',
        values: 'Multi-select event name selector',
        defaultValue: 'None',
      },
      {
        name: 'Items to show',
        description: 'Number of top items to display. Visible when View is "Top pages" or "Top referrers".',
        values: 'Number (1–500)',
        defaultValue: '5',
      },
    ],
  },
};
