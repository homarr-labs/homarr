import { Group, Image, Kbd, Stack, Text } from "@mantine/core";
import { IconDownload, IconSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { IntegrationKind } from "@homarr/definitions";
import { getIntegrationKindsByCategory, getIntegrationName } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { RequestMediaModal } from "@homarr/modals-collection";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";

import { createChildrenOptions } from "../../lib/children";
import { filterCatalog, useSearchEnginesCatalogQuery } from "../../lib/catalog";
import { createGroup } from "../../lib/group";
import type { inferSearchInteractionDefinition } from "../../lib/interaction";
import { interaction } from "../../lib/interaction";
import { useRemoteQuery } from "../../lib/remote-query";

type SearchEngine = RouterOutputs["searchEngine"]["catalog"][number];
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
    permissions?: {
      hasInteractAccess: boolean;
    };
  };
};

export const useMediaRequestSearchInteraction = (
  integration: MediaRequestChildrenProps["integration"],
  searchResult: FromIntegrationSearchResult,
): inferSearchInteractionDefinition<"link" | "children"> => {
  const { openSearchInNewTab } = useSettings();

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
      integration,
    }),
  };
};

export const useFromIntegrationSearchInteraction = (
  searchEngine: SearchEngine,
  searchResult: FromIntegrationSearchResult,
): inferSearchInteractionDefinition<"link" | "javaScript" | "children"> => {
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
    return useMediaRequestSearchInteraction(searchEngine.integration, searchResult);
  }

  return {
    type: "link",
    href: searchResult.link,
    newTab: true,
  };
};

export const mediaRequestsChildrenOptions = createChildrenOptions<MediaRequestChildrenProps>({
  useActions() {
    const { openModal } = useModalAction(RequestMediaModal);
    return [
      {
        key: "request",
        hide: (option) =>
          (option.result.type === "movie" && option.result.inLibrary) ||
          option.integration.permissions?.hasInteractAccess === false,
        Component(option) {
          const t = useI18n("search.mode.media");
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
          const tChildren = useI18n("search.mode.media");
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
          <Image src={options.result.image} alt="" w={35} h={50} fit="cover" radius={"md"} />
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
    const remoteQuery = useRemoteQuery(query, "integration-search");
    const { data } = clientApi.integration.searchInIntegration.useQuery(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      { integrationId: searchEngine.integrationId!, query: remoteQuery.query },
      {
        enabled: remoteQuery.enabled && searchEngine.type === "fromIntegration" && searchEngine.integrationId !== null,
      },
    );
    const { openSearchInNewTab } = useSettings();

    if (searchEngine.type === "generic") {
      return [
        {
          key: "search",
          Component: ({ name }) => {
            const tChildren = useI18n("search.mode.external.group.searchEngine.children");

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
              <Image src={searchResult.image} alt="" w={35} h={50} fit="cover" radius={"md"} />
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
    const tChildren = useI18n("search.mode.external.group.searchEngine.children");
    return (
      <Stack mx="md" my="sm">
        <Text>{options.type === "generic" ? tChildren("detail.title") : tChildren("searchResults.title")}</Text>
        <Group>
          <img height={24} width={24} src={options.iconUrl} alt="" />
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

export const buildSearchUrl = (template: string, query: string) => {
  const encoded = encodeURIComponent(query);
  if (template.includes("{{{s}}}")) {
    return template.replaceAll("{{{s}}}", encoded);
  }

  return template.replaceAll("%s", encoded);
};

interface SearchEngineGroupOptions {
  minimumLength: number;
  showEmptyHint: boolean;
  source: "focused" | "fallback";
}

const createSearchEnginesSearchGroup = ({ minimumLength, showEmptyHint, source }: SearchEngineGroupOptions) =>
  createGroup<ExternalOption>({
    keyPath: "key",
    title: (t) => t("common.entity.searchEngines"),
    source: source === "focused" ? { kind: "remote", source: "search-engines" } : { kind: "fallback" },
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
                <img height={24} width={24} src={option.iconUrl} alt="" />
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
              <img height={24} width={24} src={iconUrl} alt="" />
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
                {domain ?? "DuckDuckGo bang"}
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
        const nextQuery = `${`${nextBang} ${searchText}`.trimEnd()} `;
        return { type: "setQuery", query: bangToken === nextBang && query.endsWith(" ") ? query : nextQuery };
      }

      if (option.kind === "ddg") {
        const nextBang = option.bang.t;
        const nextQuery = `${`${nextBang} ${searchText}`.trimEnd()} `;
        return { type: "setQuery", query: bangToken === nextBang && query.endsWith(" ") ? query : nextQuery };
      }

      return { type: "none" };
    },
    useQueryOptions(query) {
      const tExternal = useI18n("search.mode.external.group.searchEngine");
      const { ddgBangs } = useSettings();
      const { bangToken, searchText, locked } = parseBangQuery(query);
      const remoteQuery = useRemoteQuery(bangToken, "search-engines", { minimumLength });
      const ddgQueryEnabled = remoteQuery.enabled && ddgBangs && remoteQuery.query.length >= 1;
      const enginesQuery = useSearchEnginesCatalogQuery();

      const ddgQuery = clientApi.bangs.search.useQuery(
        { query: remoteQuery.query, limit: 10 },
        {
          enabled: ddgQueryEnabled,
          placeholderData: (previousData) => previousData,
        },
      );

      const engineCatalog = enginesQuery.data ?? [];
      const engineData = filterCatalog(engineCatalog, bangToken, (engine) => [engine.short, engine.name], 10);
      const ddgData = ddgQueryEnabled && bangToken.length > 0
        ? (ddgQuery.data ?? []).filter((bang) => bang.t.toLowerCase().startsWith(bangToken.toLowerCase()))
        : [];
      const isWaitingForDdgResults =
        ddgBangs &&
        bangToken.length > 0 &&
        engineData.length === 0 &&
        (remoteQuery.query !== bangToken || (ddgQueryEnabled && ddgQuery.isFetching && ddgData.length === 0));
      const isLoading = enginesQuery.isLoading || isWaitingForDdgResults;
      const isError = enginesQuery.isError || (ddgQuery.isError && ddgQueryEnabled && bangToken.length > 0);

      const engineOptions = engineData.map(
        (engine): ExternalOption => ({
          key: `engine-${engine.short}`,
          kind: "engine",
          engine,
        }),
      );

      const ddgOptions = ddgData
        .filter((bang) => !engineOptions.some((option) => option.kind === "engine" && option.engine.short === bang.t))
        .map(
          (bang): ExternalOption => ({
            key: `ddg-${bang.t}`,
            kind: "ddg",
            bang,
          }),
        );

      const searchActions: ExternalOption[] = [];
      if (locked && bangToken.length > 0) {
        const matchedEngine = engineCatalog.find((engine) => engine.short === bangToken);
        const matchedDdg = ddgData.find((bang) => bang.t === bangToken);

        const genericEngine = matchedEngine?.type === "generic" ? matchedEngine : undefined;
        const label = genericEngine?.name ?? matchedDdg?.s;
        const iconUrl = genericEngine?.iconUrl;
        const urlTemplate = genericEngine?.urlTemplate ?? matchedDdg?.u;

        if (label && urlTemplate) {
          if (searchText.trim().length > 0) {
            searchActions.push({
              key: "search-action",
              kind: "search",
              label: tExternal("bang.searchWithQuery", {
                query: searchText.trim(),
                label,
              }),
              description: tExternal("bang.pressEnterToOpen"),
              bang: bangToken,
              iconUrl,
              urlTemplate,
              searchText: searchText.trim(),
            });
          } else {
            searchActions.push({
              key: "search-hint",
              kind: "hint",
              label: tExternal("bang.engineSelected", { label, bang: bangToken }),
              description: tExternal("bang.typeQueryToContinue"),
            });
          }
        }
      }
      if (showEmptyHint && bangToken.length === 0) {
        searchActions.push({
          key: "hint",
          kind: "hint",
          label: tExternal("bang.emptyBangHint"),
          description: ddgBangs ? tExternal("tipDdgBangs") : undefined,
        });
      }

      return {
        isLoading,
        isError,
        data: [...searchActions, ...engineOptions, ...ddgOptions].slice(0, 10),
      };
    },
  });

export const searchEnginesSearchGroups = createSearchEnginesSearchGroup({
  minimumLength: 0,
  showEmptyHint: true,
  source: "focused",
});
