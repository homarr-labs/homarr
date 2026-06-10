import { WidgetDefinition } from '@site/src/types';
import { IconDownload } from '@tabler/icons-react';

const columnsList = [
  'id',
  'actions',
  'added',
  'category',
  'downSpeed',
  'index',
  'integration',
  'name',
  'progress',
  'ratio',
  'received',
  'sent',
  'size',
  'state',
  'time',
  'type',
  'upSpeed',
];
const sortingExclusion = ['actions', 'id', 'state'];
const columnsSort = columnsList.filter(
  (column) => !sortingExclusion.some((exclusion) => exclusion === column)
);

export const downloadsWidget: WidgetDefinition = {
  icon: IconDownload,
  name: 'Download Client',
  description: 'Allows you to view and manage your Downloads from both Torrent and Usenet clients.',
  path: '../../widgets/downloads',
  configuration: {
    items: [
      {
        name: 'Columns to show',
        description: 'Select the columns you want to display in the widget.',
        values: `List of columns: ${columnsList.join(', ')}`,
        defaultValue: ['integration', 'name', 'progress', 'time', 'actions'].join(', '),
      },
      {
        name: 'Enable items sorting',
        description: 'Enables the sorting in the table.',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Column used for sorting by default',
        description: 'By default it will sort by this column.',
        defaultValue: 'type',
        values: `List of columns: ${columnsSort.join(', ')}`,
      },
      {
        name: 'Invert sorting',
        description: 'This will invert the sorting order of the table.',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Show usenet entries marked as completed',
        description: 'This will show entries that have been completed in your Usenet client.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show torrent entries marked as completed',
        description: 'This will show entries that have been completed in your Torrent client.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show Miscellaneous entries marked as completed',
        description:
          'This will show entries that have been completed in your Miscellaneous client.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Hide completed torrent under this threshold (in kiB/s)',
        description:
          'This will hide completed torrent entries that have a download speed below the specified threshold.',
        values: 'Any number above 1, 0 to disable',
        defaultValue: '0',
      },
      {
        name: 'Categories/names to filter',
        description:
          'You can filter the items by categories or names. Use a comma to separate multiple values.',
        values: 'Comma-separated list of categories or names',
        defaultValue: '-',
      },
      {
        name: 'Filter as a whitelist',
        description:
          'If enabled, only items that match the filter will be shown. If disabled, items that do not match the filter will be hidden.',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Use filter to calculate Ratio',
        description:
          'This will use the filter to calculate the ratio of items shown in the widget.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Limit items per integration',
        description: 'This will limit the number of items shown per integration, not globally',
        values: 'Any number above 1',
        defaultValue: '50',
      },
    ],
  },
};
