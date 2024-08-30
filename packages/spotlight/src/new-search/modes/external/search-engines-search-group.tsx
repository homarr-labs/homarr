import { Group, Kbd, Stack, Text } from "@mantine/core";

import { createChildrenOptions } from "../../children";
import { createGroup } from "../../group";
import { interaction } from "../../interaction";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type SearchEngine = {
  searchEngine: { short: string; image: string; name: string; description: string; urlTemplate: string };
};

const searchEnginesChildrenOptions = createChildrenOptions<SearchEngine>({
  actions: [
    {
      component: (option) => (
        <Group mx="md" my="sm">
          <Text>Search with {option.searchEngine.name}</Text>
        </Group>
      ),
      interaction: interaction.link(({ searchEngine }, query) => ({
        href: searchEngine.urlTemplate.replace("%s", query),
      })),
    },
  ],
  detailComponent({ options }) {
    return (
      <Stack mx="md" my="sm">
        <Text>Select an action for the search engine</Text>
        <Group>
          <img height={24} width={24} src={options.searchEngine.image} alt={options.searchEngine.name} />
          <Text>{options.searchEngine.name}</Text>
        </Group>
      </Stack>
    );
  },
});

export const searchEnginesSearchGroups = createGroup<SearchEngine>({
  title: "Search engines",
  component: ({ searchEngine }) => (
    <Group w="100%" wrap="nowrap" justify="space-between" align="center" px="md" py="xs">
      <Group wrap="nowrap">
        <img height={24} width={24} src={searchEngine.image} alt={searchEngine.name} />
        <Stack gap={0} justify="center">
          <Text size="sm">{searchEngine.name}</Text>
          <Text size="xs" c="gray.6">
            {searchEngine.description}
          </Text>
        </Stack>
      </Group>

      <Kbd size="sm">{searchEngine.short}</Kbd>
    </Group>
  ),
  filter: (query, option) => option.searchEngine.short.toLowerCase().startsWith(query.toLowerCase()),
  interaction: interaction.children(searchEnginesChildrenOptions),
  options: [
    {
      searchEngine: {
        short: "g",
        name: "Google",
        image: "https://www.google.com/favicon.ico",
        description: "Search the web with Google",
        urlTemplate: "https://www.google.com/search?q=%s",
      },
    },
    {
      searchEngine: {
        short: "ddg",
        name: "DuckDuckGo",
        image: "https://duckduckgo.com/favicon.ico",
        description: "Search the web with DuckDuckGo",
        urlTemplate: "https://duckduckgo.com/?q=%s",
      },
    },
  ],
});
