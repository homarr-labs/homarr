import { Group, Image, Kbd, Stack, Text } from "@mantine/core";
import { IconDownload, IconSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";

import { createChildrenOptions } from "../../lib/children";
import { createGroup } from "../../lib/group";
import { interaction } from "../../lib/interaction";

type SearchEngine = RouterOutputs["searchEngine"]["search"][number];

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type MediaRequestChildrenProps = {
  result: {
    image?: string;
    name: string;
    link: string;
    text?: string;
    type: "tv" | "movie";
  };
  integration: {
    kind: IntegrationKind;
    url: string;
  };
};

const mediaRequestsChildrenOptions = createChildrenOptions<MediaRequestChildrenProps>({
  useActions(options, query) {
    return [
      {
        key: "request",
        Component(option) {
          return (
            <Group mx="md" my="sm" wrap="nowrap">
              <IconDownload stroke={1.5} />
              <Text>Request {option.result.type === "tv" ? "series" : "movie"}</Text>
            </Group>
          );
        },
        // TODO: Open modal for serie or request directly
        useInteraction: interaction.link(() => ({ href: options.result.link, newTab: true })),
      },
      {
        key: "open",
        Component({ integration }) {
          return (
            <Group mx="md" my="sm" wrap="nowrap">
              <IconSearch stroke={1.5} />
              <Text>Open in {integration.kind}</Text>
            </Group>
          );
        },
        useInteraction({ result }) {
          return {
            type: "link",
            href: result.link,
            newTab: true,
          };
        },
      },
    ];
  },
  DetailComponent({ options }) {
    return (
      <Group mx="md" my="sm" wrap="nowrap">
        {options.result.image ? (
          <Image src={options.result.image} w={35} h={50} fit="cover" radius={"md"} />
        ) : (
          <IconSearch stroke={1.5} size={35} />
        )}
        <Stack gap={2}>
          <Text>{options.result.name}</Text>
          {options.result.text && (
            <Text c="dimmed" size="sm" lineClamp={2}>
              {options.result.text}
            </Text>
          )}
        </Stack>
      </Group>
    );
  },
});

export const searchEnginesChildrenOptions = createChildrenOptions<SearchEngine>({
  useActions: (searchEngine, query) => {
    const { data } = clientApi.integration.searchInIntegration.useQuery(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      { integrationId: searchEngine.integrationId!, query },
      {
        enabled: searchEngine.type === "fromIntegration" && searchEngine.integrationId !== null && query.length > 0,
      },
    );

    if (searchEngine.type === "generic") {
      return [
        {
          key: "search",
          Component: ({ name }) => {
            const tChildren = useScopedI18n("search.mode.external.group.searchEngine.children");

            return (
              <Group mx="md" my="sm">
                <IconSearch stroke={1.5} />
                <Text>{tChildren("action.search.label", { name })}</Text>
              </Group>
            );
          },
          useInteraction: interaction.link(({ urlTemplate }, query) => ({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            href: urlTemplate!.replace("%s", query),
          })),
        },
      ];
    }

    return (data ?? []).map((searchResult, index) => ({
      key: `search-result-${index}`,
      Component: () => {
        return (
          <Group mx="md" my="sm" wrap="nowrap">
            {searchResult.image ? (
              <Image src={searchResult.image} w={35} h={50} fit="cover" radius={"md"} />
            ) : (
              <IconSearch stroke={1.5} size={35} />
            )}
            <Stack gap={2}>
              <Text>{searchResult.name}</Text>
              {searchResult.text && (
                <Text c="dimmed" size="sm" lineClamp={2}>
                  {searchResult.text}
                </Text>
              )}
            </Stack>
          </Group>
        );
      },
      useInteraction(searchEngine) {
        if (searchEngine.type !== "fromIntegration") {
          throw new Error("Invalid search engine type");
        }

        if (!searchEngine.integration) {
          throw new Error("Invalid search engine integration");
        }

        if (
          getIntegrationKindsByCategory("mediaRequest").some(
            (categoryKind) => categoryKind === searchEngine.integration?.kind,
          ) &&
          "type" in searchResult
        ) {
          const type = searchResult.type;
          if (type === "person") {
            return {
              type: "link",
              href: searchResult.link,
              newTab: true,
            };
          }

          return {
            type: "children",
            ...mediaRequestsChildrenOptions({
              result: {
                ...searchResult,
                type,
              },
              integration: searchEngine.integration,
            }),
          };
        }

        return {
          type: "link",
          href: searchResult.link,
          newTab: true,
        };
      },
    }));
  },
  DetailComponent({ options }) {
    const tChildren = useScopedI18n("search.mode.external.group.searchEngine.children");
    return (
      <Stack mx="md" my="sm">
        <Text>{options.type === "generic" ? tChildren("detail.title") : tChildren("searchResults.title")}</Text>
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
  Component: ({ iconUrl, name, short, description }) => {
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
  useInteraction: (searchEngine, query) => {
    if (searchEngine.type === "generic" && searchEngine.urlTemplate) {
      return {
        type: "link" as const,
        href: searchEngine.urlTemplate.replace("%s", query),
        newTab: true,
      };
    }

    if (searchEngine.type === "fromIntegration" && searchEngine.integrationId !== null) {
      return {
        type: "children",
        ...searchEnginesChildrenOptions(searchEngine),
      };
    }

    throw new Error(`Unable to process search engine with type ${searchEngine.type}`);
  },
  useQueryOptions(query) {
    return clientApi.searchEngine.search.useQuery({
      query: query.trim(),
      limit: 5,
    });
  },
});
