import { Group, Image, Kbd, Stack, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconDownload, IconSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { IntegrationKind } from "@homarr/definitions";
import { getIntegrationKindsByCategory, getIntegrationName } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { RequestMediaModal } from "@homarr/modals-collection";
import { useSettings } from "@homarr/settings";
import { useScopedI18n } from "@homarr/translation/client";

import { createChildrenOptions } from "../../lib/children";
import { createGroup } from "../../lib/group";
import type { inferSearchInteractionDefinition } from "../../lib/interaction";
import { interaction } from "../../lib/interaction";

type SearchEngine = RouterOutputs["searchEngine"]["search"][number];
type FromIntegrationSearchResult = RouterOutputs["integration"]["searchInIntegration"][number];
type DuckDuckGoBang = RouterOutputs["bangs"]["search"][number];

type ExternalOption =
  | {
      key: string;
      kind: "hint";
      label: string;
      description?: string;
    }
  | {
      key: string;
      kind: "search";
      label: string;
      description?: string;
      iconUrl?: string;
      bang: string;
      urlTemplate: string;
      searchText: string;
    }
  | {
      key: string;
      kind: "engine";
      engine: SearchEngine;
    }
  | {
      key: string;
      kind: "ddg";
      bang: DuckDuckGoBang;
    };

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type MediaRequestChildrenProps = {
  result: {
    id: number;
    image?: string;
    name: string;
    link: string;
    text?: string;
    type: "tv" | "movie";
    inLibrary: boolean;
  };
  integration: {
    kind: IntegrationKind;
    url: string;
    id: string;
  };
};

export const useFromIntegrationSearchInteraction = (
  searchEngine: SearchEngine,
  searchResult: FromIntegrationSearchResult,
): inferSearchInteractionDefinition<"link" | "javaScript" | "children"> => {
  const { openSearchInNewTab } = useSettings();

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
        newTab: openSearchInNewTab,
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
};

const mediaRequestsChildrenOptions = createChildrenOptions<MediaRequestChildrenProps>({
  useActions() {
    const { openModal } = useModalAction(RequestMediaModal);
    return [
      {
        key: "request",
        hide: (option) => option.result.inLibrary,
        Component(option) {
          const t = useScopedI18n("search.mode.media");
          return (
            <Group mx="md" my="sm" wrap="nowrap">
              <IconDownload stroke={1.5} />
              {option.result.type === "tv" && <Text>{t("requestSeries")}</Text>}
              {option.result.type === "movie" && <Text>{t("requestMovie")}</Text>}
            </Group>
          );
        },
        useInteraction: interaction.javaScript((option) => ({
          onSelect() {
            openModal(
              {
                integrationId: option.integration.id,
                mediaId: option.result.id,
                mediaType: option.result.type,
              },
              {
                title(t) {
                  return t("search.engine.media.request.modal.title", { name: option.result.name });
                },
              },
            );
          },
        })),
      },
      {
        key: "open",
        Component({ integration }) {
          const tChildren = useScopedI18n("search.mode.media");
          return (
            <Group mx="md" my="sm" wrap="nowrap">
              <IconSearch stroke={1.5} />
              <Text>{tChildren("openIn", { kind: getIntegrationName(integration.kind) })}</Text>
            </Group>
          );
        },
        useInteraction({ result }) {
          const { openSearchInNewTab } = useSettings();
          return {
            type: "link",
            href: result.link,
            newTab: openSearchInNewTab,
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
    const { openSearchInNewTab } = useSettings();

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
            newTab: openSearchInNewTab,
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
      useInteraction() {
        return useFromIntegrationSearchInteraction(searchEngine, searchResult);
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

const parseBangQuery = (query: string) => {
  const withBangPrefix = query.startsWith("!") ? query.slice(1) : query;
  const bangIdx = withBangPrefix.indexOf(" ");
  const bangToken = (bangIdx === -1 ? withBangPrefix : withBangPrefix.slice(0, bangIdx)).toLowerCase().trim();
  const searchText = bangIdx === -1 ? "" : withBangPrefix.slice(bangIdx + 1);
  const locked = bangIdx !== -1;
  return { bangToken, searchText, locked };
};

const buildSearchUrl = (template: string, query: string) => {
  const encoded = encodeURIComponent(query);
  if (template.includes("{{{s}}}")) {
    return template.replaceAll("{{{s}}}", encoded);
  }

  return template.replaceAll("%s", encoded);
};

export const searchEnginesSearchGroups = createGroup<ExternalOption>({
  keyPath: "key",
  title: (t) => t("search.mode.external.group.searchEngine.title"),
  Component: (option) => {
    if (option.kind === "hint") {
      return (
        <Group w="100%" wrap="nowrap" align="center" px="md" py="xs">
          <IconSearch stroke={1.5} />
          <Stack gap={0}>
            <Text size="sm">{option.label}</Text>
            {option.description ? (
              <Text size="xs" c="gray.6">
                {option.description}
              </Text>
            ) : null}
          </Stack>
        </Group>
      );
    }

    if (option.kind === "search") {
      return (
        <Group w="100%" wrap="nowrap" justify="space-between" align="center" px="md" py="xs">
          <Group wrap="nowrap">
            {option.iconUrl ? (
              <img height={24} width={24} src={option.iconUrl} alt={option.label} />
            ) : (
              <IconSearch stroke={1.5} />
            )}
            <Stack gap={0} justify="center">
              <Text size="sm">{option.label}</Text>
              {option.description ? (
                <Text size="xs" c="gray.6">
                  {option.description}
                </Text>
              ) : null}
            </Stack>
          </Group>

          <Kbd size="sm">!{option.bang}</Kbd>
        </Group>
      );
    }

    if (option.kind === "engine") {
      const { iconUrl, name, short, description } = option.engine;
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

          <Kbd size="sm">!{short}</Kbd>
        </Group>
      );
    }

    const { s: name, t: short, d: domain } = option.bang;
    return (
      <Group w="100%" wrap="nowrap" justify="space-between" align="center" px="md" py="xs">
        <Group wrap="nowrap">
          <IconSearch stroke={1.5} />
          <Stack gap={0} justify="center">
            <Text size="sm">{name}</Text>
            <Text size="xs" c="gray.6">
              {domain ? domain : "DuckDuckGo bang"}
            </Text>
          </Stack>
        </Group>

        <Kbd size="sm">!{short}</Kbd>
      </Group>
    );
  },
  useInteraction(option, query) {
    const { openSearchInNewTab } = useSettings();
    const { bangToken, searchText } = parseBangQuery(query);

    if (option.kind === "search") {
      return {
        type: "link",
        href: buildSearchUrl(option.urlTemplate, option.searchText),
        newTab: openSearchInNewTab,
      };
    }

    if (option.kind === "engine") {
      const nextBang = option.engine.short;
      const nextQuery = `!${nextBang} ${searchText}`.trimEnd() + " ";
      return { type: "setQuery", query: bangToken === nextBang && query.endsWith(" ") ? query : nextQuery };
    }

    if (option.kind === "ddg") {
      const nextBang = option.bang.t;
      const nextQuery = `!${nextBang} ${searchText}`.trimEnd() + " ";
      return { type: "setQuery", query: bangToken === nextBang && query.endsWith(" ") ? query : nextQuery };
    }

    return { type: "none" };
  },
  useQueryOptions(query) {
    const tExternal = useScopedI18n("search.mode.external.group.searchEngine");
    const { bangToken, searchText, locked } = parseBangQuery(query);
    const [debouncedBangToken] = useDebouncedValue(bangToken, 100);
    const enginesQueryToken = query === "!" ? "" : debouncedBangToken;
    const enginesQuery = clientApi.searchEngine.search.useQuery({ query: enginesQueryToken, limit: 10 });

    const ddgQuery = clientApi.bangs.search.useQuery(
      { query: debouncedBangToken, limit: 20 },
      {
        enabled: debouncedBangToken.length > 0,
      },
    );

    const isLoading = enginesQuery.isLoading || ddgQuery.isLoading;
    const isError = enginesQuery.isError || ddgQuery.isError;

    const engineOptions = (enginesQuery.data ?? []).map(
      (engine): ExternalOption => ({
        key: `engine-${engine.short}`,
        kind: "engine",
        engine,
      }),
    );

    const ddgOptions = (ddgQuery.data ?? [])
      .filter((bang) => !engineOptions.some((o) => o.kind === "engine" && o.engine.short === bang.t))
      .map(
        (bang): ExternalOption => ({
          key: `ddg-${bang.t}`,
          kind: "ddg",
          bang,
        }),
      );

    const searchActions: ExternalOption[] = [];
    if (locked && bangToken.length > 0) {
      const matchedEngine = (enginesQuery.data ?? []).find((e) => e.short === bangToken);
      const matchedDdg = (ddgQuery.data ?? []).find((b) => b.t === bangToken);

      const label = matchedEngine?.name ?? matchedDdg?.s;
      const iconUrl = matchedEngine?.iconUrl;
      const urlTemplate = matchedEngine?.type === "generic" ? matchedEngine.urlTemplate : matchedDdg?.u;

      if (label && urlTemplate) {
        if (searchText.trim().length > 0) {
          searchActions.push({
            key: "search-action",
            kind: "search",
            label: `Search "${searchText.trim()}" with ${label}`,
            description: "Press Enter to open",
            bang: bangToken,
            iconUrl,
            urlTemplate,
            searchText: searchText.trim(),
          });
        } else {
          searchActions.push({
            key: "search-hint",
            kind: "hint",
            label: `${label} selected (!${bangToken})`,
            description: "Type your search query to continue",
          });
        }
      }
    } if (query.length === 0) {
      searchActions.push({
        key: "hint",
        kind: "hint",
        label: "Type a bang, e.g. !yt, then press Space to select",
        description: tExternal("tip.ddgBangs"),
      });
    }

    return {
      isLoading,
      isError,
      data: [...searchActions, ...engineOptions, ...ddgOptions],
    };
  },
});
