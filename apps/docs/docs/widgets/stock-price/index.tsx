import { WidgetDefinition } from '@site/src/types';
import { IconBuildingBank } from '@tabler/icons-react';

export const stockPriceWidget: WidgetDefinition = {
  icon: IconBuildingBank,
  name: 'Stock Price',
  description: 'Displays the current stock price of a company.',
  path: '../../widgets/stock-price',
  configuration: {
    items: [
      {
        name: 'Stock symbol',
        description: 'The stock symbol of the company you want to track',
        defaultValue: 'AAPL',
        values: 'List of URLs',
      },
      {
        name: 'Time Range',
        description: 'Time range of the diagram',
        values: {
          type: 'select',
          options: [
            '1 Day',
            '5 Day',
            '1 Month',
            '3 Months',
            '6 Months',
            'Year to Date',
            '1 Year',
            '2 Years',
            '5 Years',
            '10 Years',
            'Max',
          ],
        },
        defaultValue: '1 Month',
      },
      {
        name: 'Time Interval',
        description: 'Interval between data points',
        values: {
          type: 'select',
          options: [
            '5 Minutes',
            '15 Minutes',
            '30 Minutes',
            '1 Hour',
            '1 Day',
            '5 Days',
            '1 Week',
            '1 Month',
          ],
        },
        defaultValue: '1 Day',
      },
    ],
  },
};
