import { Group, Stack, Text } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { UserAvatar } from "@homarr/ui";

import { createChildrenOptions } from "../../children";
import { createGroup } from "../../group";
import { interaction } from "../../interaction";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type User = { id: string; name: string; image: string | null };

const userChildrenOptions = createChildrenOptions<User>({
  useActions: [
    {
      component: () => (
        <Group mx="md" my="sm">
          <IconEye stroke={1.5} />
          <Text>Show user details</Text>
        </Group>
      ),
      interaction: interaction.link(({ id }) => ({ href: `/manage/users/${id}/general` })),
    },
  ],
  detailComponent: ({ options }) => (
    <Stack mx="md" my="sm">
      <Text>Select an action for the user</Text>

      <Group>
        <UserAvatar user={options} size="sm" />
        <Text>{options.name}</Text>
      </Group>
    </Stack>
  ),
});

export const usersSearchGroup = createGroup<User>({
  title: "Users",
  component: (user) => (
    <Group px="md" py="sm">
      <UserAvatar user={user} size="sm" />
      <Text>{user.name}</Text>
    </Group>
  ),
  useInteraction: interaction.children(userChildrenOptions),
  useQueryOptions(query) {
    return clientApi.user.search.useQuery({ query, limit: 5 });
  },
});
