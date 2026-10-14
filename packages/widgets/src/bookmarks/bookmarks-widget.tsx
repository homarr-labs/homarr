"use client";

import { useMemo } from "react";
import { useLocalStorage } from "@mantine/hooks";
import { IconLink } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";
import { iconSizes, zoomCompensatedSize } from "@homarr/ui";

import { getSafeAppHref } from "../common/application-url";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { createDirectBookmark, getBookmarkFaviconUrl, getDirectBookmarkUrl } from "./bookmark-item";
import { getBookmarkCardDisplay, getBookmarkDisplayPlan } from "./layout";
import { getBookmarkGroups } from "./groups-data";
import { BookmarksNativeView } from "./native-view";

export default function BookmarksWidget({
  options,
  itemId,
  width,
  height,
  displayMode,
  displayScale = 1,
}: WidgetComponentProps<"bookmarks">) {
  const t = useI18n("widget.bookmarks");
  const board = useRequiredBoard();
  const advanced = displayMode === "advanced";
  const appIds = useMemo(() => options.items.filter((value) => !getDirectBookmarkUrl(value)), [options.items]);
  const appsQuery = clientApi.app.byIds.useQuery(appIds, {
    select(selectedApps) {
      return selectedApps;
    },
  });
  const apps = getUsableWidgetQueryData(appsQuery) ?? [];
  const appsById = new Map(apps.map((app) => [app.id, app]));
  const configuredItems = options.items.flatMap((value) => {
    const directUrl = getDirectBookmarkUrl(value);
    if (directUrl) return createDirectBookmark(directUrl) ?? [];
    return appsById.get(value) ?? [];
  });
  const configuredHrefs = new Set(configuredItems.map((item) => item.href));
  const legacyItems = options.customUrls.flatMap((url) => {
    const item = createDirectBookmark(url);
    if (!item || configuredHrefs.has(item.href)) return [];
    return [item];
  });
  const data = [...configuredItems, ...legacyItems];
  const groups = getBookmarkGroups(options.groups);
  const groupedIds = new Set<string>();
  const sections = groups.flatMap((group) => {
    const items = data.filter((item) => group.itemIds.includes(item.id) && !groupedIds.has(item.id));
    for (const item of items) groupedIds.add(item.id);
    if (items.length === 0) return [];
    return [{ ...group, items }];
  });
  const ungroupedItems = data.filter((item) => !groupedIds.has(item.id));
  const [collapsedGroups, setCollapsedGroups] = useLocalStorage<string[]>({
    key: `homarr-bookmarks-collapsed-${itemId ?? "preview"}`,
    defaultValue: [],
  });

  let responsiveWidth = width;
  let responsiveHeight = height;
  if (!advanced && Number.isFinite(displayScale) && displayScale > 0) {
    responsiveWidth *= displayScale;
    responsiveHeight *= displayScale;
  }
  const showTitle = options.showTitle && options.title.length > 0;
  let titleHeight = 0;
  if (showTitle) titleHeight = 36 + (options.titleSize - 11) * 1.2;
  const contentHeight = Math.max(0, responsiveHeight - titleHeight);
  let layoutWidth = responsiveWidth;
  if (options.layout === "gridHorizontal") layoutWidth = width;

  useRegisterSpotlightContextResults(
    `bookmark-${itemId}`,
    data.flatMap((bookmark) => {
      const href = getSafeAppHref(bookmark.href);
      if (!href) return [];
      return [
        {
          id: bookmark.id,
          dedupeKey: appsById.has(bookmark.id) ? `app:${bookmark.id}` : undefined,
          name: bookmark.name,
          icon: bookmark.iconUrl ?? IconLink,
          interaction() {
            return { type: "link" as const, href, newTab: false };
          },
        },
      ];
    }),
    [data],
  );

  const plan = useMemo(
    () =>
      getBookmarkDisplayPlan({
        advanced,
        gap: bookmarkSpacingPixels[options.spacing],
        height: contentHeight,
        itemCount: data.length,
        layout: options.layout,
        width: layoutWidth,
      }),
    [advanced, contentHeight, data.length, layoutWidth, options.layout, options.spacing],
  );
  const cardDisplay = getBookmarkCardDisplay({
    advanced,
    hideHostname: options.hideHostname,
    hideIcon: options.hideIcon,
    hideTitle: options.hideTitle,
    plan,
  });
  if (appIds.length > 0 && isInitialWidgetQueryPending(appsQuery)) return <WidgetQueryLoadingState />;

  return (
    <BookmarksNativeView
      options={options}
      data={data}
      sections={sections}
      ungroupedItems={ungroupedItems}
      collapsedGroups={collapsedGroups}
      onGroupsChange={(opened) => {
        const visibleIds = new Set(sections.map((section) => section.id));
        setCollapsedGroups((current) => [
          ...current.filter((id) => !visibleIds.has(id)),
          ...sections.filter((section) => !opened.includes(section.id)).map((section) => section.id),
        ]);
      }}
      plan={plan}
      cardDisplay={cardDisplay}
      advanced={advanced}
      showTitle={showTitle}
      responsiveHeight={responsiveHeight}
      displayScale={displayScale}
      radius={board.itemRadius}
      labels={{ empty: t("empty"), ungrouped: t("groups.ungrouped") }}
      getBookmarkFaviconUrl={getBookmarkFaviconUrl}
      zoomCompensatedSize={zoomCompensatedSize}
      iconSizes={iconSizes}
    />
  );
}

const bookmarkSpacingPixels = { xs: 10, sm: 12, md: 16, lg: 20, xl: 32 } as const;
