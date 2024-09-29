import { ActionIcon, Avatar, Button, Group, Stack, Text } from "@mantine/core";
import { IconClock, IconX } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { AppSelectModal } from "./app-select-modal";

export const { definition, componentLoader } = createWidgetDefinition("bookmarks", {
  icon: IconClock,
  options: optionsBuilder.from((factory) => ({
    title: factory.text(),
    items: factory.sortableItemList<RouterOutputs["app"]["all"][number], string>({
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

            <ActionIcon variant="transparent" color="red" onClick={removeItem}>
              <IconX size={20} />
            </ActionIcon>
          </Group>
        );
      },
      addButton({ addItem, values }) {
        const { openModal } = useModalAction(AppSelectModal);
        const t = useI18n();

        return (
          <Button onClick={() => openModal({ onSelect: addItem, presentAppIds: values })}>
            {t("widget.bookmarks.option.items.add")}
          </Button>
        );
      },
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
