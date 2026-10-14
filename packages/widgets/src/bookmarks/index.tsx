import { ActionIcon, Avatar, Group, Stack, Text } from "@mantine/core";
import { IconLink, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition } from "../definition";
import { BookmarkAddButton } from "./add-button";
import { getBookmarkFaviconUrl } from "./bookmark-item";
import { createDefinition } from "./definition";
import { BookmarkGroupSelect } from "./groups";

const bookmarkDefinition = createDefinition({
  useAppByIds: (appIds) => clientApi.app.byIds.useQuery(appIds),
  AddButton: BookmarkAddButton,
  ItemComponent: ({ item, handle, removeItem, removeLabel, rootAttributes }) => {
    const iconUrl = item.iconUrl ?? getBookmarkFaviconUrl(item.href);
    return (
      <Group {...rootAttributes} tabIndex={0} justify="space-between" wrap="nowrap">
        <Group wrap="nowrap" miw={0}>
          {handle}

          <Group wrap="nowrap" miw={0}>
            <Avatar src={iconUrl} name={item.name} color="gray" radius="sm">
              <IconLink size={20} />
            </Avatar>
            <Stack gap={0} miw={0}>
              <Text fw={600} truncate>
                {item.name}
              </Text>
              <BookmarkGroupSelect itemId={item.id} name={item.name} />
              <Text size="xs" c="dimmed" truncate>
                {item.href}
              </Text>
            </Stack>
          </Group>
        </Group>

        <ActionIcon variant="subtle" color="red" onClick={removeItem} aria-label={removeLabel}>
          <IconX size="var(--mantine-font-size-xl)" />
        </ActionIcon>
      </Group>
    );
  },
});

export const { definition, componentLoader } = createWidgetDefinition(
  "bookmarks",
  bookmarkDefinition,
).withDynamicImport(() => import("./component"));
