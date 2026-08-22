import { ActionIcon, Avatar, Group, Stack, Text } from "@mantine/core";
import { IconBookmark, IconLink, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { BookmarkAddButton } from "./add-button";
import type { BookmarkSelectionItem } from "./add-button";
import { createDirectBookmark, getBookmarkFaviconUrl, getDirectBookmarkUrl } from "./bookmark-item";

export const { definition, componentLoader } = createWidgetDefinition("bookmarks", {
  icon: IconBookmark,
  supportsAdvancedFocus: true,
  queryKey: [["app", "byIds"]],
  createOptions() {
    return optionsBuilder.from((factory) => ({
      title: factory.text(),
      layout: factory.select({
        options: (["adaptive", "column", "row", "grid", "gridHorizontal", "icons"] as const).map((value) => ({
          value,
          label: (t) => {
            if (value === "adaptive") return t("widget.bookmarks.option.layout.option.adaptive.label");
            if (value === "grid") return t("widget.common.layout.option.grid");
            if (value === "row") return t("widget.common.layout.option.horizontal");
            if (value === "column") return t("widget.common.layout.option.vertical");
            if (value === "icons") return t("widget.bookmarks.option.layout.option.icons.label");
            return t("widget.bookmarks.option.layout.option.gridHorizontal.label");
          },
        })),
        defaultValue: "adaptive",
      }),
      variant: factory.select({
        options: (["soft", "filled", "outline", "plain"] as const).map((value) => ({
          value,
          label: (t) => t(`widget.bookmarks.option.variant.option.${value}.label`),
        })),
        defaultValue: "soft",
      }),
      hideTitle: factory.switch({ defaultValue: false }),
      hideIcon: factory.switch({ defaultValue: false }),
      hideHostname: factory.switch({ defaultValue: false }),
      openNewTab: factory.switch({ defaultValue: true }),
      withBorder: factory.switch({ defaultValue: false }),
      customUrls: factory.internal({ defaultValue: [] as string[] }),
      items: factory.sortableItemList<BookmarkSelectionItem, string>({
        ItemComponent: ({ item, handle, removeItem, rootAttributes }) => {
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
                    <Text size="xs" c="dimmed" truncate>
                      {item.href}
                    </Text>
                  </Stack>
                </Group>
              </Group>

              <ActionIcon variant="subtle" color="red" onClick={removeItem} aria-label="Remove bookmark">
                <IconX size="var(--mantine-font-size-xl)" />
              </ActionIcon>
            </Group>
          );
        },
        AddButton: BookmarkAddButton,
        uniqueIdentifier: (item) => item.id,
        useData: (initialIds) => {
          const appIds = initialIds.filter((value) => !getDirectBookmarkUrl(value));
          const { data: apps, error, isLoading } = clientApi.app.byIds.useQuery(appIds);
          const appsById = new Map(apps?.map((app) => [app.id, app]));
          const data = initialIds.flatMap((value) => {
            const directUrl = getDirectBookmarkUrl(value);
            if (directUrl) return createDirectBookmark(directUrl) ?? [];
            return appsById.get(value) ?? [];
          });

          return {
            data,
            error,
            isLoading,
          };
        },
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
