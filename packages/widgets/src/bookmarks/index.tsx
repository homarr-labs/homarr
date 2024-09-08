import { ActionIcon, Avatar, Button, Group, Stack, Text } from "@mantine/core";
import { IconClock, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import type { BookmarkItem } from "./bookmark-item";

export const { definition, componentLoader } = createWidgetDefinition("bookmarks", {
  icon: IconClock,
  options: optionsBuilder.from((factory) => ({
    title: factory.text(),
    items: factory.sortableItemList<BookmarkItem>({
      itemComponent: ({ item, handle: Handle, removeItem, rootAttributes }) => {
        return (
          <Group {...rootAttributes} tabIndex={0} justify="space-between" wrap="nowrap">
            <Group wrap="nowrap">
              <Handle />

              <Group>
                <Avatar src={item.iconUrl} alt={item.name} />
                <Stack gap={0}>
                  <Text>{item.name}</Text>
                </Stack>
              </Group>
            </Group>

            <ActionIcon variant="transparent" color="red" onClick={() => removeItem?.()}>
              <IconX size={20} />
            </ActionIcon>
          </Group>
        );
      },
      addButton(props) {
        return <Button onClick={() => props.addItem({ id: "", name: "New bookmark" })}>Add bookmark</Button>;
      },
      useData: () => {
        const { data } = clientApi.app.all.useQuery();
        return new Map(data?.map((item) => [item.id, item]) ?? []);
      },
    }),
  })),
}).withDynamicImport(() => import("./component"));
