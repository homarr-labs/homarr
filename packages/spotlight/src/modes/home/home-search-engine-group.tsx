import { Group, Text } from "@mantine/core";
import type { TablerIcon } from "@tabler/icons-react";
import { IconCaretUpDown } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { createGroup } from "../../lib/group";
import type { inferSearchInteractionDefinition, SearchInteraction } from "../../lib/interaction";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type GroupItem = {
  id: string;
  name: string;
  icon: TablerIcon | string;
  interaction: (query: string) => inferSearchInteractionDefinition<SearchInteraction>;
};

export const homeSearchEngineGroup = createGroup<GroupItem>({
  title: "Search",
  keyPath: "id",
  Component(item) {
    const icon =
      typeof item.icon !== "string" ? (
        <item.icon size={24} />
      ) : (
        <img width={24} height={24} src={item.icon} alt={item.name} />
      );

    return (
      <Group w="100%" wrap="nowrap" align="center" px="md" py="xs">
        {icon}
        <Text>{item.name}</Text>
      </Group>
    );
  },
  useInteraction(item, query) {
    return item.interaction(query);
  },
  filter() {
    return true;
  },
  useQueryOptions() {
    const { data: defaultSearchEngine, ...query } = clientApi.searchEngine.getDefaultSearchEngine.useQuery();

    return {
      ...query,
      data: [
        defaultSearchEngine
          ? {
              id: "default",
              name: `Search with Google`,
              icon: defaultSearchEngine.iconUrl,
              interaction(query) {
                return {
                  type: "link",
                  href: defaultSearchEngine.urlTemplate.replace("%s", query),
                };
              },
            }
          : {
              id: "default",
              name: `Search with Google`,
              icon: "https://www.google.com/favicon.ico",
              interaction(query) {
                return {
                  type: "link",
                  href: `https://www.google.com/search?q=${query}`,
                };
              },
            },
        {
          id: "other",
          name: "Search with another search engine",
          icon: IconCaretUpDown,
          interaction() {
            return {
              type: "mode",
              mode: "external",
            };
          },
        },
      ],
    };
  },
  /*useOptions() {
    // TODO: Load default search engines from settings
    return [
      {
        id: "default",
        name: `Search with Google`,
        icon: "https://www.google.com/favicon.ico",
        interaction(query) {
          return {
            type: "link",
            href: `https://www.google.com/search?q=${query}`,
          };
        },
      },
      {
        id: "other",
        name: "Search with another search engine",
        icon: IconCaretUpDown,
        interaction() {
          return {
            type: "mode",
            mode: "external",
          };
        },
      },
    ];
  },*/
});
