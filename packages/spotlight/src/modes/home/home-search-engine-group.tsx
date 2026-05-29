import { Box, Group, Stack, Text } from "@mantine/core";
import { IconMovie, IconSearch, IconSearchOff } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { Session } from "@homarr/auth";
import { useSession } from "@homarr/auth/client";
import { useSettings } from "@homarr/settings";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { createGroup } from "../../lib/group";
import type { inferSearchInteractionDefinition, SearchInteraction } from "../../lib/interaction";
import { useFromIntegrationSearchInteraction } from "../external/search-engines-search-group";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type GroupItem = {
  id: string;
  name: string;
  description?: string;
  icon: TablerIcon | string;
  disabled?: boolean;
  useInteraction: (query: string) => inferSearchInteractionDefinition<SearchInteraction>;
};

export const homeSearchEngineGroup = createGroup<GroupItem>({
  title: (t) => t("search.mode.home.group.search.title"),
  keyPath: "id",
  Component(item) {
    const icon =
      typeof item.icon !== "string" ? (
        <item.icon size={24} />
      ) : (
        <Box w={24} h={24}>
          <img src={item.icon} alt={item.name} style={{ maxWidth: 24 }} />
        </Box>
      );

    return (
      <Group w="100%" wrap="nowrap" align="center" px="md" py="xs" opacity={item.disabled ? 0.55 : 1}>
        {icon}
        <Stack gap={0}>
          <Text>{item.name}</Text>
          {item.description && (
            <Text c="gray.6" size="sm">
              {item.description}
            </Text>
          )}
        </Stack>
      </Group>
    );
  },
  useInteraction(item, query) {
    return item.useInteraction(query);
  },
  filter() {
    return true;
  },
  useQueryOptions(query) {
    const t = useI18n();
    const { data: session, status } = useSession();
    const { data: defaultSearchEngine, ...defaultSearchEngineQuery } =
      clientApi.searchEngine.getDefaultSearchEngine.useQuery(undefined, {
        enabled: status !== "loading",
      });
    const { data: mediaRequestSearchTargets, ...mediaRequestSearchTargetsQuery } =
      clientApi.integration.mediaRequestSearchTargets.useQuery(undefined, {
        enabled: status !== "loading" && session?.user !== undefined,
      });
    const fromIntegrationEnabled = defaultSearchEngine?.type === "fromIntegration" && query.length > 0;
    const { data: results, ...resultQuery } = clientApi.integration.searchInIntegration.useQuery(
      {
        query,
        integrationId: defaultSearchEngine?.integrationId ?? "",
      },
      {
        enabled: fromIntegrationEnabled,
        select: (data) => data.slice(0, 5),
      },
    );

    return {
      isLoading:
        defaultSearchEngineQuery.isLoading ||
        mediaRequestSearchTargetsQuery.isLoading ||
        (resultQuery.isLoading && fromIntegrationEnabled) ||
        status === "loading",
      isError:
        defaultSearchEngineQuery.isError ||
        mediaRequestSearchTargetsQuery.isError ||
        (resultQuery.isError && fromIntegrationEnabled),
      data: createDefaultSearchEntries(defaultSearchEngine, results, mediaRequestSearchTargets, session, query, t),
    };
  },
});

const createDefaultSearchEntries = (
  defaultSearchEngine: RouterOutputs["searchEngine"]["getDefaultSearchEngine"] | null,
  results: RouterOutputs["integration"]["searchInIntegration"] | undefined,
  mediaRequestSearchTargets: RouterOutputs["integration"]["mediaRequestSearchTargets"] | undefined,
  session: Session | null,
  query: string,
  t: TranslationFunction,
): GroupItem[] => {
  const mediaRequestSearchEntry: GroupItem = {
    id: "media-request-search",
    name: t("search.mode.media.action.search.label"),
    description:
      mediaRequestSearchTargets && mediaRequestSearchTargets.length === 0
        ? t("search.mode.media.action.search.disabled.noIntegration")
        : t("search.mode.media.action.search.description"),
    icon: IconMovie,
    disabled: !mediaRequestSearchTargets || mediaRequestSearchTargets.length === 0,
    useInteraction(query) {
      if (!mediaRequestSearchTargets || mediaRequestSearchTargets.length === 0) {
        return {
          type: "none",
        };
      }

      return {
        type: "mode",
        mode: "media",
        query,
      };
    },
  };

  if (!session?.user && !defaultSearchEngine) return [mediaRequestSearchEntry];

  if (!defaultSearchEngine) {
    return [
      mediaRequestSearchEntry,
      {
        id: "no-default",
        name: t("search.mode.home.group.search.option.no-default.label"),
        description: t("search.mode.home.group.search.option.no-default.description"),
        icon: IconSearchOff,
        useInteraction() {
          return {
            type: "link",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            href: `/manage/users/${session!.user.id}/general`,
          };
        },
      },
    ];
  }

  if (defaultSearchEngine.type === "generic") {
    return [
      mediaRequestSearchEntry,
      {
        id: "search",
        name: t("search.mode.home.group.search.option.search.label", {
          query,
          name: defaultSearchEngine.name,
        }),
        icon: defaultSearchEngine.iconUrl,
        useInteraction(query) {
          const { openSearchInNewTab } = useSettings();
          return {
            type: "link",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            href: defaultSearchEngine.urlTemplate!.replace("%s", query),
            newTab: openSearchInNewTab,
          };
        },
      },
    ];
  }

  if (!results) {
    return [
      mediaRequestSearchEntry,
      {
        id: "from-integration",
        name: defaultSearchEngine.name,
        icon: defaultSearchEngine.iconUrl,
        description: t("search.mode.home.group.search.option.from-integration.description"),
        useInteraction() {
          return {
            type: "none",
          };
        },
      },
    ];
  }

  return [
    mediaRequestSearchEntry,
    ...results.map((result) => ({
      id: `search-${result.id}`,
      name: result.name,
      description: result.text,
      icon: result.image ?? IconSearch,
      useInteraction() {
        return useFromIntegrationSearchInteraction(defaultSearchEngine, result);
      },
    })),
  ];
};
