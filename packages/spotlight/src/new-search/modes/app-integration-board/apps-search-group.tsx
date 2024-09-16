import { Avatar, Group, Stack, Text } from "@mantine/core";
import { IconExternalLink, IconEye } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { createChildrenOptions } from "../../children";
import { createGroup } from "../../group";
import { interaction } from "../../interaction";

// This has to be type so it can be interpreted as Record<string, unknown>.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type App = { id: string; name: string; iconUrl: string; href: string | null };

const appChildrenOptions = createChildrenOptions<App>({
  useActions: () => [
    {
      component: () => (
        <Group mx="md" my="sm">
          <IconExternalLink stroke={1.5} />
          <Text>Open app url</Text>
        </Group>
      ),
      useInteraction: (option) => (option.href ? { type: "link", href: option.href } : { type: "disabled" }),
    },
    {
      component: () => (
        <Group mx="md" my="sm">
          <IconEye stroke={1.5} />
          <Text>Edit app</Text>
        </Group>
      ),
      useInteraction: interaction.link(({ id }) => ({ href: `/manage/apps/edit/${id}` })),
    },
  ],
  detailComponent: ({ options }) => (
    <Stack mx="md" my="sm">
      <Text>Select an action for the app</Text>

      <Group>
        <Avatar
          size="sm"
          src={options.iconUrl}
          radius={0}
          styles={{
            image: {
              objectFit: "contain",
            },
          }}
        />
        <Text>{options.name}</Text>
      </Group>
    </Stack>
  ),
});

export const appsSearchGroup = createGroup<App>({
  title: "Apps",
  component: (app) => (
    <Group px="md" py="sm">
      <Avatar
        size="sm"
        src={app.iconUrl}
        radius={0}
        styles={{
          image: {
            objectFit: "contain",
          },
        }}
      />{" "}
      <Text>{app.name}</Text>
    </Group>
  ),
  useInteraction: interaction.children(appChildrenOptions),
  useQueryOptions(query) {
    return clientApi.app.search.useQuery({ query, limit: 5 });
  },
});
