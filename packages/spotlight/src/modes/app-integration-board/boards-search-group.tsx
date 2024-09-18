import { Group, Stack, Text } from "@mantine/core";
import { IconHome, IconLayoutDashboard, IconLink, IconSettings } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";

import type { ChildrenAction } from "../../lib/children";
import { createChildrenOptions } from "../../lib/children";
import { createGroup } from "../../lib/group";
import { interaction } from "../../lib/interaction";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Board = { id: string; name: string; logoImageUrl: string | null };

const boardChildrenOptions = createChildrenOptions<Board>({
  useActions: () => {
    const { data: session } = useSession();

    const actions: (ChildrenAction<Board> & { hidden?: boolean })[] = [
      {
        key: "open",
        component: () => (
          <Group mx="md" my="sm">
            <IconLink stroke={1.5} />
            <Text>Open board</Text>
          </Group>
        ),
        useInteraction: interaction.link(({ name }) => ({ href: `/boards/${name}` })),
      },
      {
        key: "home-board",
        component: () => (
          <Group mx="md" my="sm">
            <IconHome stroke={1.5} />
            <Text>Set as your home board</Text>
          </Group>
        ),
        useInteraction(option) {
          // TODO: Maybe we can add some sort of loading state here
          const { mutateAsync } = clientApi.board.setHomeBoard.useMutation(); // TODO: Put this somewhere centralized so it can be used at multiple places

          return {
            type: "javaScript",
            // eslint-disable-next-line no-restricted-syntax
            async onSelect() {
              await mutateAsync({ id: option.id });
            },
          };
        },
      },
      {
        key: "settings",
        component: () => (
          <Group mx="md" my="sm">
            <IconSettings stroke={1.5} />
            <Text>Open settings</Text>
          </Group>
        ),
        useInteraction: interaction.link(({ name }) => ({ href: `/boards/${name}/settings` })),
        hidden: !session?.user.permissions.includes("board-modify-all"), // TODO: adjust as all users with board permissions can access settings
      },
    ];

    return actions;
  },
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
  keyPath: "id",
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
  useInteraction: interaction.children(boardChildrenOptions),
  useQueryOptions(query) {
    return clientApi.board.search.useQuery({ query, limit: 5 });
  },
});
