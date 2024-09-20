import { Group, Stack, Text } from "@mantine/core";
import type { TablerIcon } from "@tabler/icons-react";
import { IconDownload } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import { createGroup } from "../../lib/group";
import { interaction } from "../../lib/interaction";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type SearchEngine = {
  short: string;
  image: string | TablerIcon;
  name: string;
  description: string;
  urlTemplate: string;
};

export const searchEnginesSearchGroups = createGroup<SearchEngine>({
  keyPath: "short",
  title: (t) => t("search.mode.external.group.searchEngine.title"),
  component: ({ image: Image, name, description }) => (
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
    </Group>
  ),
  filter: () => true,
  useInteraction: interaction.link(({ urlTemplate }, query) => ({
    href: urlTemplate.replace("%s", query),
    newTab: true,
  })),
  useOptions() {
    const tOption = useScopedI18n("search.mode.external.group.searchEngine.option");

    return [
      {
        short: "g",
        name: tOption("google.name"),
        image: "https://www.google.com/favicon.ico",
        description: tOption("google.description"),
        urlTemplate: "https://www.google.com/search?q=%s",
      },
      {
        short: "b",
        name: tOption("bing.name"),
        image: "https://www.bing.com/favicon.ico",
        description: tOption("bing.description"),
        urlTemplate: "https://www.bing.com/search?q=%s",
      },
      {
        short: "d",
        name: tOption("duckduckgo.name"),
        image: "https://duckduckgo.com/favicon.ico",
        description: tOption("duckduckgo.description"),
        urlTemplate: "https://duckduckgo.com/?q=%s",
      },
      {
        short: "t",
        name: tOption("torrent.name"),
        image: IconDownload,
        description: tOption("torrent.description"),
        urlTemplate: "https://www.torrentdownloads.pro/search/?search=%s",
      },
      {
        short: "y",
        name: tOption("youTube.name"),
        image: "https://www.youtube.com/favicon.ico",
        description: tOption("youTube.description"),
        urlTemplate: "https://www.youtube.com/results?search_query=%s",
      },
    ];
  },
});
