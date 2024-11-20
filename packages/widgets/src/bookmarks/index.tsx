import { ActionIcon, Avatar, Group, Stack, Text } from "@mantine/core";
import { IconClock, IconX } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { BookmarkAddButton } from "./add-button";

export const { definition, componentLoader } = createWidgetDefinition("bookmarks", {
  icon: IconClock,
  options: optionsBuilder.from((factory) => ({
    title: factory.text(),
    layout: factory.select({
      options: (["grid", "row", "column"] as const).map((value) => ({
        value,
        label: (t) => t(`widget.bookmarks.option.layout.option.${value}.label`),
      })),
      defaultValue: "column",
    }),
    items: factory.sortableItemList<RouterOutputs["app"]["all"][number], string>({
      ItemComponent: ({ item, handle: Handle, removeItem, rootAttributes }) => {
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

            <ActionIcon variant="transparent" color="red" onClick={removeItem}>
              <IconX size={20} />
            </ActionIcon>
          </Group>
        );
      },
      AddButton: BookmarkAddButton,
      uniqueIdentifier: (item) => item.id,
      useData: (initialIds) => {
        const { data, error, isLoading } = clientApi.app.byIds.useQuery(initialIds);

        return {
          data,
          error,
          isLoading,
        };
      },
    }),
  })),
}).withDynamicImport(() => import("./component"));
