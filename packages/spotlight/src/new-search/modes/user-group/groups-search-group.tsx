import { Group, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

import { createGroup } from "../../group";
import { interaction } from "../../interaction";

export const groupsSearchGroup = createGroup<{ group: { name: string } }>({
  title: "Groups",
  component: ({ group }) => (
    <Group px="md" py="sm">
      <Text>{group.name}</Text>
    </Group>
  ),
  interaction: interaction.javaScript(({ group }) => ({ onSelect: () => console.log(group) })),
  useOptions(query) {
    return clientApi.group.search.useQuery(
      { query, limit: 5 },
      {
        select(data) {
          return data.map((group) => ({
            group,
          }));
        },
      },
    );
  },
});
