import { Group, Kbd, Stack, Text } from "@mantine/core";
import { IconDownload, IconSearch, IconStar } from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";

import { createChildrenOptions } from "../../children";
import { createGroup } from "../../group";
import { interaction } from "../../interaction";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type SearchEngine = {
  short: string;
  image: string | TablerIcon;
  name: string;
  description: string;
  urlTemplate: string;
};

export const searchEnginesChildrenOptions = createChildrenOptions<SearchEngine>({
  useActions: [
    {
      component: ({ name }) => (
        <Group mx="md" my="sm">
          <IconSearch stroke={1.5} />
          <Text>Search with {name}</Text>
        </Group>
      ),
      interaction: interaction.link(({ urlTemplate }, query) => ({
        href: urlTemplate.replace("%s", query),
      })),
    },
    {
      component: () => (
        <Group mx="md" my="sm">
          <IconStar stroke={1.5} />
          <Text>Mark as favorite</Text>
        </Group>
      ),
      interaction: interaction.javaScript(({ name }) => ({
        onSelect: () => {
          // TODO: I'll need to add support for trpc mutations here
          console.log(`Marked ${name} as favorite`);
        },
      })),
    },
  ],
  detailComponent({ options }) {
    return (
      <Stack mx="md" my="sm">
        <Text>Select an action for the search engine</Text>
        <Group>
          {typeof options.image === "string" ? (
            <img height={24} width={24} src={options.image} alt={options.name} />
          ) : (
            <options.image size={24} />
          )}
          <Text>{options.name}</Text>
        </Group>
      </Stack>
    );
  },
});

export const searchEnginesSearchGroups = createGroup<SearchEngine>({
  title: "Search engines",
  component: ({ image: Image, name, description, short }) => (
    <Group w="100%" wrap="nowrap" justify="space-between" align="center" px="md" py="xs">
      <Group wrap="nowrap">
        {typeof Image === "string" ? <img height={24} width={24} src={Image} alt={name} /> : <Image size={24} />}
        <Stack gap={0} justify="center">
          <Text size="sm">{name}</Text>
          <Text size="xs" c="gray.6">
            {description}
          </Text>
        </Stack>
      </Group>

      <Kbd size="sm">{short}</Kbd>
    </Group>
  ),
  filter: (query, { short }) => short.toLowerCase().startsWith(query.toLowerCase()),
  useInteraction: interaction.children(searchEnginesChildrenOptions),
  options: [
    {
      short: "g",
      name: "Google",
      image: "https://www.google.com/favicon.ico",
      description: "Search the web with Google",
      urlTemplate: "https://www.google.com/search?q=%s",
    },
    {
      short: "b",
      name: "Bing",
      image: "https://www.bing.com/favicon.ico",
      description: "Search the web with Bing",
      urlTemplate: "https://www.bing.com/search?q=%s",
    },
    {
      short: "d",
      name: "DuckDuckGo",
      image: "https://duckduckgo.com/favicon.ico",
      description: "Search the web with DuckDuckGo",
      urlTemplate: "https://duckduckgo.com/?q=%s",
    },
    {
      short: "t",
      name: "Torrents",
      image: IconDownload,
      description: "Search for torrents on torrentdownloads.pro",
      urlTemplate: "https://www.torrentdownloads.pro/search/?search=%s",
    },
    {
      short: "y",
      name: "YouTube",
      image: "https://www.youtube.com/favicon.ico",
      description: "Search for videos on YouTube",
      urlTemplate: "https://www.youtube.com/results?search_query=%s",
    },
  ],
});
