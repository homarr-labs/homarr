import { Group, Stack, Text } from "@mantine/core";
import { IconHome, IconLayoutDashboard, IconLink, IconSettings } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { ChildrenAction } from "../../lib/children";
import { createChildrenOptions } from "../../lib/children";
import { createGroup } from "../../lib/group";
import { interaction } from "../../lib/interaction";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Board = {
  id: string;
  name: string;
  logoImageUrl: string | null;
  permissions: { hasFullAccess: boolean; hasChangeAccess: boolean; hasViewAccess: boolean };
};

const boardChildrenOptions = createChildrenOptions<Board>({
  useActions: (options) => {
    const actions: (ChildrenAction<Board> & { hidden?: boolean })[] = [
      {
        key: "open",
        component: () => {
          const t = useI18n();

          return (
            <Group mx="md" my="sm">
              <IconLink stroke={1.5} />
              <Text>{t("search.mode.appIntegrationBoard.group.board.children.action.open.label")}</Text>
            </Group>
          );
        },
        useInteraction: interaction.link(({ name }) => ({ href: `/boards/${name}` })),
      },
      {
        key: "homeBoard",
        component: () => {
          const t = useI18n();

          return (
            <Group mx="md" my="sm">
              <IconHome stroke={1.5} />
              <Text>{t("search.mode.appIntegrationBoard.group.board.children.action.homeBoard.label")}</Text>
            </Group>
          );
        },
        useInteraction(option) {
          const { mutateAsync } = clientApi.board.setHomeBoard.useMutation();

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
        component: () => {
          const t = useI18n();

          return (
            <Group mx="md" my="sm">
              <IconSettings stroke={1.5} />
              <Text>{t("search.mode.appIntegrationBoard.group.board.children.action.settings.label")}</Text>
            </Group>
          );
        },
        useInteraction: interaction.link(({ name }) => ({ href: `/boards/${name}/settings` })),
        hidden: !options.permissions.hasChangeAccess,
      },
    ];

    return actions;
  },
  detailComponent: ({ options: board }) => {
    const t = useI18n();

    return (
      <Stack mx="md" my="sm">
        <Text>{t("search.mode.appIntegrationBoard.group.board.children.detail.title")}</Text>

        <Group>
          {board.logoImageUrl ? (
            <img src={board.logoImageUrl} alt={board.name} width={24} height={24} />
          ) : (
            <IconLayoutDashboard size={24} />
          )}

          <Text>{board.name}</Text>
        </Group>
      </Stack>
    );
  },
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
