import { Group, Stack, Text } from "@mantine/core";
import { IconEye, IconUsersGroup } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { createChildrenOptions } from "../../lib/children";
import { createGroup } from "../../lib/group";
import { interaction } from "../../lib/interaction";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Group = { id: string; name: string };

const groupChildrenOptions = createChildrenOptions<Group>({
  useActions: () => [
    {
      key: "details",
      component: () => (
        <Group mx="md" my="sm">
          <IconEye stroke={1.5} />
          <Text>Show group details</Text>
        </Group>
      ),
      useInteraction: interaction.link(({ id }) => ({ href: `/manage/users/groups/${id}` })),
    },
    {
      key: "manage-members",
      component: () => (
        <Group mx="md" my="sm">
          <IconUsersGroup stroke={1.5} />
          <Text>Manage members</Text>
        </Group>
      ),
      useInteraction: interaction.link(({ id }) => ({ href: `/manage/users/groups/${id}/members` })),
    },
    {
      key: "manage-permissions",
      component: () => (
        <Group mx="md" my="sm">
          <IconEye stroke={1.5} />
          <Text>Manage permissions</Text>
        </Group>
      ),
      useInteraction: interaction.link(({ id }) => ({ href: `/manage/users/groups/${id}/permissions` })),
    },
  ],
  detailComponent: ({ options }) => (
    <Stack mx="md" my="sm">
      <Text>Select an action for the group</Text>

      <Group>
        <Text>{options.name}</Text>
      </Group>
    </Stack>
  ),
});

export const groupsSearchGroup = createGroup<Group>({
  keyPath: "id",
  title: "Groups",
  component: ({ name }) => (
    <Group px="md" py="sm">
      <Text>{name}</Text>
    </Group>
  ),
  useInteraction: interaction.children(groupChildrenOptions),
  useQueryOptions(query) {
    return clientApi.group.search.useQuery({ query, limit: 5 });
  },
});
