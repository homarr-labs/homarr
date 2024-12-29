import { Group, Text } from "@mantine/core";
import { IconCaretUpDown } from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";

import { createGroup } from "../../lib/group";
import { interaction } from "../../lib/interaction";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type GroupItem = {
  id: string;
  name: string;
  icon: TablerIcon | string;
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
  useInteraction: interaction.javaScript(() => ({
    onSelect() {
      console.log("Selected");
    },
  })),
  filter() {
    return true;
  },
  useOptions(query) {
    // TODO: Load default search engines from settings
    return [
      {
        id: "default",
        name: `Search for '${query}' with Google`,
        icon: "https://www.google.com/favicon.ico",
      },
      {
        id: "other",
        name: "Search with other search engine",
        icon: IconCaretUpDown,
      },
    ];
  },
});
