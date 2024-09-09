import { Group, Stack, Text } from "@mantine/core";
import { IconHome, IconLayoutDashboard, IconLink, IconSettings } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { createChildrenOptions } from "../../children";
import { createGroup } from "../../group";
import { interaction } from "../../interaction";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Board = { id: string; name: string; logoImageUrl: string | null };

const boardChildrenOptions = createChildrenOptions<Board>({
  actions: [
    {
      component: () => (
        <Group mx="md" my="sm">
          <IconLink stroke={1.5} />
          <Text>Open board</Text>
        </Group>
      ),
      interaction: interaction.link(({ name }) => ({ href: `/boards/${name}` })),
    },
    {
      component: () => (
        <Group mx="md" my="sm">
          <IconHome stroke={1.5} />
          <Text>Set as your home board</Text>
        </Group>
      ),
      interaction: interaction.javaScript(() => ({
        onSelect() {
          console.log("Set as home board");
        },
      })),
    },
    {
      component: () => (
        <Group mx="md" my="sm">
          <IconSettings stroke={1.5} />
          <Text>Open settings</Text>
        </Group>
      ),
      interaction: interaction.link(({ name }) => ({ href: `/boards/${name}/settings` })),
    },
  ],
  detailComponent: ({ options: board }) => (
    <Stack mx="md" my="sm">
      <Text>Select an action for the board</Text>

      <Group>
        {board.logoImageUrl ? (
          <img src={board.logoImageUrl} alt={board.name} width={24} height={24} />
        ) : (
          <IconLayoutDashboard size={24} />
        )}

        <Text>{board.name}</Text>
      </Group>
    </Stack>
  ),
});

export const boardsSearchGroup = createGroup<Board>({
  title: "Boards",
  component: (board) => (
    <Group px="md" py="sm">
      {board.logoImageUrl ? (
        <img src={board.logoImageUrl} alt={board.name} width={24} height={24} />
      ) : (
        <IconLayoutDashboard size={24} />
      )}

      <Text>{board.name}</Text>
    </Group>
  ),
  // TODO: Add children
  interaction: interaction.children(boardChildrenOptions),
  useQueryOptions(query) {
    return clientApi.board.search.useQuery({ query, limit: 5 });
  },
});
