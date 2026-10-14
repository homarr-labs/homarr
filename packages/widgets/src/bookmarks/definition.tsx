import { IconBookmark } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import type { SortableItemListInput } from "../options";
import { createDirectBookmark, getDirectBookmarkUrl } from "./bookmark-item";
import type { BookmarkGroup } from "./groups-data";
import type { BookmarkAppIds, BookmarkAppsByIdsObservation, BookmarkSelectionItem } from "./selection-type";

export interface DefinitionResources {
  useAppByIds: (appIds: BookmarkAppIds) => BookmarkAppsByIdsObservation;
  AddButton: SortableItemListInput<BookmarkSelectionItem, string>["AddButton"];
  ItemComponent: SortableItemListInput<BookmarkSelectionItem, string>["ItemComponent"];
}

export const createDefinition = (resources: DefinitionResources) =>
  ({
    kind: "bookmarks",
    icon: IconBookmark,
    supportsAdvancedFocus: true,
    queryKey: [["app", "byIds"]],
    createOptions() {
      return optionsBuilder.from((factory) => ({
        title: factory.text(),
        showTitle: factory.switch({ defaultValue: true }),
        titleSize: factory.slider({
          defaultValue: 11,
          validate: z.number().min(8).max(32),
          step: 1,
        }),
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
        spacing: factory.select({
          options: (["xs", "sm", "md", "lg", "xl"] as const).map((value) => ({
            value,
            label: (t) => t(`widget.bookmarks.option.spacing.option.${value}.label`),
          })),
          defaultValue: "xs",
        }),
        hideTitle: factory.switch({ defaultValue: false }),
        hideIcon: factory.switch({ defaultValue: false }),
        hideHostname: factory.switch({ defaultValue: false }),
        openNewTab: factory.switch({ defaultValue: true }),
        withBorder: factory.switch({ defaultValue: false }),
        grow: factory.switch({ defaultValue: false }),
        customUrls: factory.internal({ defaultValue: [] as string[] }),
        groups: factory.internal({ defaultValue: [] as BookmarkGroup[] }),
        items: factory.sortableItemList<BookmarkSelectionItem, string>({
          ItemComponent: resources.ItemComponent,
          AddButton: resources.AddButton,
          uniqueIdentifier: (item) => item.id,
          useData: (initialIds) => {
            const appIds = initialIds.filter((value) => !getDirectBookmarkUrl(value));
            const { data: apps, error, isLoading } = resources.useAppByIds(appIds);
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
  }) satisfies WidgetDefinition & { kind: "bookmarks" };
