import { WidgetDefinition } from '@site/src/types';
import { IconRocket } from '@tabler/icons-react';

export const releasesWidget: WidgetDefinition = {
  icon: IconRocket,
  name: 'Releases',
  description:
    'Displays a list of the current version of the given repositories with the given version regex.',
  path: '../../widgets/releases',
  configuration: {
    items: [
      {
        name: 'New Release Within',
        description: 'The time period in which a new release is marked as new.',
        values: "Any timespan in format '12h', '3d', '2w', '6M', '1y'.",
        defaultValue: '1w',
      },
      {
        name: 'Stale Release Within',
        description: 'The time period in which a release is marked as stale.',
        values: "Any timespan in format '12h', '3d', '2w', '6M', '1y'.",
        defaultValue: '6M',
      },
      {
        name: 'Show Only Highlighted',
        description: 'Show only new or stale releases. As per the above.',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Show Details',
        description: 'Show the row below the repository with stats about the repository.',
        values: { type: 'boolean' },
        defaultValue: 'yes',
      },
      {
        name: 'Show only icon',
        description: 'Hides the repository name or identifier',
        values: { type: 'boolean' },
        defaultValue: 'no',
      },
      {
        name: 'Top Releases',
        description: 'The max number of latest releases to show. Zero means no limit.',
        values: 'Any positive integer or zero to disable the limit.',
        defaultValue: '0',
      },
      {
        name: 'Repositories',
        description: 'The repositories to show releases for.',
        values: {
          name: 'Repositories',
          type: 'array',
          configuration: {
            items: [
              {
                name: 'Provider',
                description: 'Integration to fetch the repository from.',
                values: 'Select from the available integrations.',
                defaultValue: '-',
              },
              {
                name: 'Identifier',
                description: 'The identifier of the repository, e.g. "homarr-labs/homarr".',
                values: 'Any valid repository identifier.',
                defaultValue: '-',
              },
              {
                name: 'Name',
                description: 'Display name of the repository.',
                values: { type: 'string' },
                defaultValue: '-',
              },
              {
                name: 'Icon URL',
                description: 'URL to the icon of the repository.',
                values: { type: 'string' },
                defaultValue: '-',
              },
              {
                name: 'Version Regex',
                description: 'The regex to extract the version from the release tag.',
                values: {
                  name: 'Version Regex',
                  type: 'object',
                  configuration: {
                    items: [
                      {
                        name: 'Prefix',
                        description: 'The prefix to match before the version.',
                        values: { type: 'string' },
                        defaultValue: '',
                      },
                      {
                        name: 'Precision',
                        description: 'The precision of the version',
                        values: {
                          type: 'select',
                          options: ['None', '#', '#.#', '#.#.#', '#.#.#.#', '#.#.#.#.#'],
                        },
                        defaultValue: 'None',
                      },
                      {
                        name: 'Suffix',
                        description: 'The suffix to match after the version.',
                        values: { type: 'string' },
                        defaultValue: '',
                      },
                    ],
                  },
                },
                defaultValue: 'None',
              },
            ],
          },
        },
        defaultValue: 'None',
      },
    ],
  },
};
