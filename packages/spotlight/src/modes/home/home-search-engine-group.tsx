import { Box, Group, Stack, Text } from "@mantine/core";
import { IconSearchOff } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { useSession } from "@homarr/auth/client";
import { useSettings } from "@homarr/settings";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { useSearchEnginesCatalogQuery } from "../../lib/catalog";
import { createGroup } from "../../lib/group";
import type { inferSearchInteractionDefinition, SearchInteraction } from "../../lib/interaction";
import { buildSearchUrl } from "../external/search-engines-search-group";

type SearchEngine = RouterOutputs["searchEngine"]["catalog"][number];

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type GroupItem = {
  id: string;
  name: string;
  description?: string;
  icon: TablerIcon | string;
  disabled?: boolean;
  interaction: inferSearchInteractionDefinition<SearchInteraction>;
};

export const homeSearchEngineGroup = createGroup<GroupItem>({
  title: (t) => t("search.mode.home.group.search.title"),
  keyPath: "id",
  source: { kind: "fallback" },
  Component(item) {
    const icon =
      typeof item.icon !== "string" ? (
        <item.icon size={24} />
      ) : (
        <Box w={24} h={24}>
          <img src={item.icon} alt="" style={{ maxWidth: 24 }} />
        </Box>
      );

    return (
      <Group w="100%" wrap="nowrap" align="center" px="md" py="xs" opacity={item.disabled ? 0.55 : 1}>
        {icon}
        <Stack gap={0}>
          <Text>{item.name}</Text>
          {item.description ? (
            <Text c="gray.6" size="sm">
              {item.description}
            </Text>
          ) : null}
        </Stack>
      </Group>
    );
  },
  useInteraction(item) {
    return item.interaction;
  },
  useQueryOptions(query) {
    const t = useI18n();
    const { data: session } = useSession();
    const { openSearchInNewTab } = useSettings();
    const catalogQuery = useSearchEnginesCatalogQuery();

    return {
      isLoading: catalogQuery.isLoading,
      isError: catalogQuery.isError,
      data: createSearchEntries(
        catalogQuery.data ?? [],
        session?.user.permissions.includes("search-engine-create") === true,
        query,
        openSearchInNewTab,
        t,
      ),
    };
  },
});

const createSearchEntries = (
  searchEngines: SearchEngine[],
  canCreateSearchEngine: boolean,
  query: string,
  openInNewTab: boolean,
  t: TranslationFunction,
): GroupItem[] => {
  if (searchEngines.length === 0) {
    return [
      {
        id: "no-search-engines",
        name: t("search.mode.home.group.search.option.no-engines.label"),
        description: canCreateSearchEngine
          ? t("search.mode.home.group.search.option.no-engines.descriptionCreate")
          : t("search.mode.home.group.search.option.no-engines.descriptionUnavailable"),
        icon: IconSearchOff,
        disabled: !canCreateSearchEngine,
        interaction: canCreateSearchEngine ? { type: "link", href: "/manage/search-engines/new" } : { type: "none" },
      },
    ];
  }

  const normalizedQuery = query.trim();
  return searchEngines.map((searchEngine) => {
    const name =
      normalizedQuery.length === 0
        ? searchEngine.name
        : t("search.mode.home.group.search.option.search.label", {
            query: normalizedQuery,
            name: searchEngine.name,
          });

    if (searchEngine.type === "generic") {
      return {
        id: `search-${searchEngine.id}`,
        name,
        description: searchEngine.description ?? undefined,
        icon: searchEngine.iconUrl,
        interaction: {
          type: "link",
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          href: buildSearchUrl(searchEngine.urlTemplate!, normalizedQuery),
          newTab: openInNewTab,
        },
      };
    }

    return {
      id: `search-${searchEngine.id}`,
      name,
      description: searchEngine.description ?? undefined,
      icon: searchEngine.iconUrl,
      interaction: {
        type: "mode",
        mode: "external",
        query: `${searchEngine.short} ${normalizedQuery}`.trimEnd(),
      },
    };
  });
};
