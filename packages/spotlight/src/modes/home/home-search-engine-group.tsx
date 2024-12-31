import { Box, Group, Stack, Text } from "@mantine/core";
import type { TablerIcon } from "@tabler/icons-react";
import { IconCaretUpDown, IconSearch, IconSearchOff } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { Session } from "@homarr/auth";
import { useSession } from "@homarr/auth/client";

import { createGroup } from "../../lib/group";
import type { inferSearchInteractionDefinition, SearchInteraction } from "../../lib/interaction";
import { useFromIntegrationSearchInteraction } from "../external/search-engines-search-group";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type GroupItem = {
  id: string;
  name: string;
  description?: string;
  icon: TablerIcon | string;
  useInteraction: (query: string) => inferSearchInteractionDefinition<SearchInteraction>;
};

export const homeSearchEngineGroup = createGroup<GroupItem>({
  title: "Search",
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
      <Group w="100%" wrap="nowrap" align="center" px="md" py="xs">
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
    const { data: session, status } = useSession();
    const { data: defaultSearchEngine, ...defaultSearchEngineQuery } =
      clientApi.searchEngine.getDefaultSearchEngine.useQuery(undefined, {
        enabled: status !== "loading",
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
        defaultSearchEngineQuery.isLoading || (resultQuery.isLoading && fromIntegrationEnabled) || status === "loading",
      isError: defaultSearchEngineQuery.isError || (resultQuery.isError && fromIntegrationEnabled),
      data: [
        ...createDefaultSearchEntries(defaultSearchEngine, results, session),
        {
          id: "other",
          name: "Search with another search engine",
          icon: IconCaretUpDown,
          useInteraction() {
            return {
              type: "mode",
              mode: "external",
            };
          },
        },
      ],
    };
  },
});

const createDefaultSearchEntries = (
  defaultSearchEngine: RouterOutputs["searchEngine"]["getDefaultSearchEngine"] | null,
  results: RouterOutputs["integration"]["searchInIntegration"] | undefined,
  session: Session | null,
): GroupItem[] => {
  if (!session?.user && !defaultSearchEngine) {
    console.log("fuck this code!");
    return [];
  }

  if (!defaultSearchEngine) {
    return [
      {
        id: "no-default",
        name: "No default search engine",
        description: "Set a default search engine in settings",
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
      {
        id: "search",
        name: `Search with ${defaultSearchEngine.name}`,
        icon: defaultSearchEngine.iconUrl,
        useInteraction(query) {
          return {
            type: "link",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            href: defaultSearchEngine.urlTemplate!.replace("%s", query),
          };
        },
      },
    ];
  }

  if (!results) {
    return [
      {
        id: "from-integration-tip",
        name: "Start typing to search",
        icon: defaultSearchEngine.iconUrl,
        useInteraction() {
          return {
            type: "none",
          };
        },
      },
    ];
  }

  return results.map((result) => ({
    id: `search-${result.id}`,
    name: result.name,
    description: result.text,
    icon: result.image ?? IconSearch,
    useInteraction() {
      return useFromIntegrationSearchInteraction(defaultSearchEngine, result);
    },
  }));
};
