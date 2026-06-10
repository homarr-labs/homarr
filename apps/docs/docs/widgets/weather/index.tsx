import { WidgetDefinition } from '@site/src/types';
import { IconCloud } from '@tabler/icons-react';

export const weatherWidget: WidgetDefinition = {
  icon: IconCloud,
  name: 'Weather',
  description: 'Displays the current weather information of a set location.',
  path: '../../widgets/weather',
  configuration: {
    items: [
      {
        name: 'Temperature in Fahrenheit',
        description: 'Display temperature in Fahrenheit instead of Celsius',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Disable temperature decimals',
        description: 'Show temperature as full number',
        values: {
          type: 'boolean',
        },
        defaultValue: 'no',
      },
      {
        name: 'Show current wind speed',
        description: 'Display current wind speed, only for current weather',
        values: {
          type: 'boolean',
        },
        defaultValue: 'yes',
      },
      {
        name: 'Use imperial speed units',
        description: 'Display wind speed in mph instead of km/h',
        values: {
          type: 'boolean',
        },
        defaultValue: 'no',
      },
      {
        name: 'Weather location',
        description: 'Location for which to display the weather information',
        values: 'Select location through search or longitude/latitude',
        defaultValue: 'Paris / 48.85341, 2.3488',
      },
      {
        name: 'Date format',
        description: 'Format for displaying the date in the widget',
        values: {
          type: 'select',
          options: [
            'dddd, MMMM D',
            'dddd, D MMMM',
            'MMM D',
            'D MMM',
            'DD/MM/YYYY',
            'MM/DD/YYYY',
            'DD/MM',
            'MM/DD',
          ],
        },
        defaultValue: 'dddd, MMMM D',
      },
      {
        name: 'Show city',
        description: 'Display the city name in the widget',
        values: {
          type: 'boolean',
        },
        defaultValue: 'no',
      },
      {
        name: 'Has forecast',
        description: 'Display a forecast for the next few days',
        values: {
          type: 'boolean',
        },
        defaultValue: 'no',
      },
      {
        name: 'Amount of forecast days',
        description: 'Number of days to show in the forecast',
        values: '1-7',
        defaultValue: '5',
      },
    ],
  },
};
