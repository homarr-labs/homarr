import { Group, Stack, Text } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { UserAvatar } from "@homarr/ui";

import { createChildrenOptions } from "../../children";
import { createGroup } from "../../group";
import { interaction } from "../../interaction";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type User = { user: { id: string; name: string; image: string | null } };

const userChildrenOptions = createChildrenOptions<User>({
  actions: [
    {
      component: () => (
        <Group mx="md" my="sm">
          <IconEye stroke={1.5} />
          <Text>Show user details</Text>
        </Group>
      ),
      interaction: interaction.link(({ user }) => ({ href: `/manage/users/${user.id}/general` })),
    },
  ],
  detailComponent: ({ options }) => (
    <Stack mx="md" my="sm">
      <Text>Select an action for the user</Text>

      <Group>
        <UserAvatar user={options.user} size="sm" />
        <Text>{options.user.name}</Text>
      </Group>
    </Stack>
  ),
});

export const usersSearchGroup = createGroup<User>({
  title: "Users",
  component: ({ user }) => (
    <Group px="md" py="sm">
      <UserAvatar user={user} size="sm" />
      <Text>{user.name}</Text>
    </Group>
  ),
  interaction: interaction.children(userChildrenOptions),
  useOptions(query) {
    return clientApi.user.search.useQuery(
      { query, limit: 5 },
      {
        select(data) {
          return data.map((user) => ({
            user,
          }));
        },
      },
    );
  },
});
