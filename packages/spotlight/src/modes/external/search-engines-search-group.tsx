import { Group, Kbd, Stack, Text } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import { createChildrenOptions } from "../../lib/children";
import { createGroup } from "../../lib/group";
import { interaction } from "../../lib/interaction";

type SearchEngine = RouterOutputs["searchEngine"]["search"][number];

export const searchEnginesChildrenOptions = createChildrenOptions<SearchEngine>({
  useActions: () => [
    {
      key: "search",
      component: ({ name }) => {
        const tChildren = useScopedI18n("search.mode.external.group.searchEngine.children");

        return (
          <Group mx="md" my="sm">
            <IconSearch stroke={1.5} />
            <Text>{tChildren("action.search.label", { name })}</Text>
          </Group>
        );
      },
      useInteraction: interaction.link(({ urlTemplate }, query) => ({
        href: urlTemplate.replace("%s", query),
      })),
    },
  ],
  detailComponent({ options }) {
    const tChildren = useScopedI18n("search.mode.external.group.searchEngine.children");
    return (
      <Stack mx="md" my="sm">
        <Text>{tChildren("detail.title")}</Text>
        <Group>
          <img height={24} width={24} src={options.iconUrl} alt={options.name} />
          <Text>{options.name}</Text>
        </Group>
      </Stack>
    );
  },
});

export const searchEnginesSearchGroups = createGroup<SearchEngine>({
  keyPath: "short",
  title: (t) => t("search.mode.external.group.searchEngine.title"),
  component: ({ iconUrl, name, short, description }) => {
    return (
      <Group w="100%" wrap="nowrap" justify="space-between" align="center" px="md" py="xs">
        <Group wrap="nowrap">
          <img height={24} width={24} src={iconUrl} alt={name} />
          <Stack gap={0} justify="center">
            <Text size="sm">{name}</Text>
            <Text size="xs" c="gray.6">
              {description}
            </Text>
          </Stack>
        </Group>

        <Kbd size="sm">{short}</Kbd>
      </Group>
    );
  },
  onKeyDown(event, options, query, { setChildrenOptions }) {
    if (event.code !== "Space") return;

    const engine = options.find((option) => option.short === query);
    if (!engine) return;

    setChildrenOptions(searchEnginesChildrenOptions(engine));
  },
  useInteraction: interaction.link(({ urlTemplate }, query) => ({
    href: urlTemplate.replace("%s", query),
    newTab: true,
  })),
  useQueryOptions(query) {
    return clientApi.searchEngine.search.useQuery({
      query: query.trim(),
      limit: 5,
    });
  },
});
