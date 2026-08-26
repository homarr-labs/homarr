"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  Center,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { IconArrowUpRight, IconBookmark, IconLink } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";
import { iconSizes, zoomCompensatedSize } from "@homarr/ui";

import { getSafeAppHref, SAFE_NEW_TAB_REL } from "../common/application-url";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { createDirectBookmark, getBookmarkFaviconUrl, getDirectBookmarkUrl } from "./bookmark-item";
import type { BookmarkItem } from "./bookmark-item";
import { getBookmarkCardDisplay, getBookmarkDisplayPlan } from "./layout";
import type { BookmarkOrientation } from "./layout";

type BookmarkVariant = WidgetComponentProps<"bookmarks">["options"]["variant"];

export default function BookmarksWidget({
  options,
  itemId,
  width,
  height,
  displayMode,
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
            return {
              type: "link" as const,
              href,
              newTab: false,
            };
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
        height: options.title.length > 0 ? height - 36 : height,
        itemCount: data.length,
        layout: options.layout,
        width,
      }),
    [advanced, data.length, height, options.layout, options.title.length, width],
  );

  const cardDisplay = getBookmarkCardDisplay({
    advanced,
    hideHostname: options.hideHostname,
    hideIcon: options.hideIcon,
    hideTitle: options.hideTitle,
    plan,
  });

  const cards = data.map((bookmark) => (
    <BookmarkCard
      key={bookmark.id}
      bookmark={bookmark}
      advanced={advanced}
      orientation={cardDisplay.orientation}
      showHostname={cardDisplay.showHostname}
      showIcon={cardDisplay.showIcon}
      showTitle={cardDisplay.showTitle}
      openNewTab={options.openNewTab}
      variant={options.variant}
      withBorder={options.withBorder}
      radius={board.itemRadius}
      height={plan.itemHeight}
      width={plan.horizontalScroll ? plan.itemWidth : undefined}
    />
  ));

  if (appIds.length > 0 && isInitialWidgetQueryPending(appsQuery)) return <WidgetQueryLoadingState />;

  return (
    <Stack h="100%" mih={0} gap={height < 120 ? 6 : "sm"} p={height < 120 ? 6 : "sm"}>
      {options.title.length > 0 ? (
        <Text fz={11} fw={600} px={2} lh={1.2} lineClamp={1}>
          {options.title}
        </Text>
      ) : null}

      {data.length === 0 ? (
        <Center flex={1}>
          <Stack align="center" gap={6}>
            <ThemeIcon variant="light" size="lg" radius="xl">
              <IconBookmark style={iconSizes.xl} />
            </ThemeIcon>
            <Text size="sm" c="dimmed" ta="center">
              {t("empty")}
            </Text>
          </Stack>
        </Center>
      ) : (
        <ScrollArea scrollbars={plan.horizontalScroll ? "x" : "y"} style={{ flex: 1, minHeight: 0 }}>
          <Box miw="100%" mih="100%" pb={2}>
            {plan.horizontalScroll ? (
              <Group gap={options.spacing} wrap="nowrap" mih="100%" align="stretch">
                {cards}
              </Group>
            ) : (
              <SimpleGrid cols={plan.columns} spacing={options.spacing} verticalSpacing={options.spacing}>
                {cards}
              </SimpleGrid>
            )}
          </Box>
        </ScrollArea>
      )}
    </Stack>
  );
}

interface BookmarkCardProps {
  advanced: boolean;
  bookmark: BookmarkItem;
  height: number;
  openNewTab: boolean;
  orientation: BookmarkOrientation;
  radius: string;
  showHostname: boolean;
  showIcon: boolean;
  showTitle: boolean;
  variant: BookmarkVariant;
  width?: number;
  withBorder: boolean;
}

const BookmarkCard = ({
  advanced,
  bookmark,
  height,
  openNewTab,
  orientation,
  radius,
  showHostname,
  showIcon,
  showTitle,
  variant,
  width,
  withBorder,
}: BookmarkCardProps) => {
  const [active, setActive] = useState(false);
  const reduceMotion = useReducedMotion();
  const href = getSafeAppHref(bookmark.href);
  const hostname = bookmark.href ? getBookmarkHostname(bookmark.href) : undefined;
  const iconUrl = bookmark.iconUrl ?? getBookmarkFaviconUrl(bookmark.href);
  const iconOnly = orientation === "icon" || (!showTitle && !showHostname);
  const background = getBookmarkBackground(variant, active);

  const content =
    orientation === "vertical" && !advanced ? (
      <Stack h="100%" align="center" justify="center" gap={6} flex={1}>
        {showIcon ? <BookmarkAvatar bookmark={bookmark} iconUrl={iconUrl} size={iconOnly ? 34 : 38} /> : null}
        {showTitle ? (
          <Text size="xxs" fw={600} lh={1.2} ta="center" lineClamp={2}>
            {bookmark.name}
          </Text>
        ) : null}
        {showHostname ? (
          <Text fz={9} c="dimmed" ta="center" truncate w="100%">
            {hostname}
          </Text>
        ) : null}
      </Stack>
    ) : (
      <Group
        h="100%"
        gap={advanced ? "sm" : "xs"}
        wrap="nowrap"
        justify={iconOnly ? "center" : "flex-start"}
        align="center"
        flex={1}
      >
        {showIcon ? (
          <BookmarkAvatar bookmark={bookmark} iconUrl={iconUrl} size={advanced ? 42 : iconOnly ? 32 : 30} />
        ) : null}
        {!iconOnly ? (
          <Stack gap={advanced ? 3 : 0} miw={0} flex={1}>
            {showTitle ? (
              <Text size={advanced ? "xs" : "xxs"} fw={600} lh={1.2} truncate>
                {bookmark.name}
              </Text>
            ) : null}
            {showHostname ? (
              <Text fz={advanced ? 10 : 9} c="dimmed" truncate>
                {hostname}
              </Text>
            ) : null}
            {advanced && bookmark.description ? (
              <Text fz={10} c="dimmed" lineClamp={2}>
                {bookmark.description}
              </Text>
            ) : null}
          </Stack>
        ) : null}
        {advanced ? (
          <ThemeIcon
            variant={active ? "light" : "transparent"}
            color={active ? "primaryColor" : "gray"}
            size="sm"
            radius="xl"
            style={{
              opacity: active ? 1 : 0.45,
              transform: active && !reduceMotion ? "translate(1px, -1px)" : undefined,
              transition: reduceMotion ? undefined : "opacity 120ms ease, transform 120ms ease",
            }}
          >
            <IconArrowUpRight style={iconSizes.sm} />
          </ThemeIcon>
        ) : null}
      </Group>
    );

  return (
    <Tooltip
      label={
        <Stack gap={0}>
          <Text size="xs" fw={600}>
            {bookmark.name}
          </Text>
          {hostname ? (
            <Text size="xs" opacity={0.8}>
              {hostname}
            </Text>
          ) : null}
        </Stack>
      }
      openDelay={450}
      disabled={advanced}
      withArrow
    >
      <Card
        component={href ? "a" : "div"}
        href={href}
        target={href ? (openNewTab ? "_blank" : "_self") : undefined}
        rel={href && openNewTab ? SAFE_NEW_TAB_REL : undefined}
        aria-label={bookmark.name}
        radius={radius}
        withBorder={withBorder || variant === "outline"}
        p={iconOnly ? 6 : advanced ? "md" : "xs"}
        h={height}
        w={width}
        miw={width}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        styles={{
          root: {
            background,
            borderColor: active
              ? "rgb(from var(--mantine-primary-color-filled) r g b / calc(var(--opacity, 1) * 0.62))"
              : "rgb(from var(--mantine-color-secondaryColor-filled) r g b / calc(var(--opacity, 1) * 0.38))",
            boxShadow: active ? "var(--mantine-shadow-sm)" : undefined,
            color: "var(--mantine-color-text)",
            cursor: href ? "pointer" : "default",
            display: "flex",
            outline: active ? "2px solid var(--mantine-primary-color-light)" : undefined,
            outlineOffset: -2,
            overflow: "hidden",
            textDecoration: "none",
            transform: active && !reduceMotion ? "translateY(-1px)" : undefined,
            transition: reduceMotion
              ? undefined
              : "background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
          },
        }}
      >
        {content}
      </Card>
    </Tooltip>
  );
};

const BookmarkAvatar = ({ bookmark, iconUrl, size }: { bookmark: BookmarkItem; iconUrl?: string; size: number }) => (
  <Avatar
    src={iconUrl}
    name={bookmark.name}
    color="gray"
    radius="sm"
    size={size}
    imageProps={{ referrerPolicy: "no-referrer" }}
    styles={{ image: { objectFit: "contain" } }}
  >
    <IconLink style={zoomCompensatedSize(Math.max(14, size / 2))} />
  </Avatar>
);

const getBookmarkBackground = (variant: BookmarkVariant, active: boolean): string => {
  if (variant === "plain" || variant === "outline") return "transparent";
  if (variant === "filled") {
    const opacity = active ? 0.64 : 0.48;
    return `rgb(from var(--mantine-color-default-hover) r g b / calc(var(--opacity, 1) * ${opacity}))`;
  }

  const opacity = active ? 0.14 : 0.08;
  return `rgb(from var(--mantine-primary-color-filled) r g b / calc(var(--opacity, 1) * ${opacity}))`;
};

const getBookmarkHostname = (href: string): string | undefined => {
  try {
    return new URL(href).hostname || undefined;
  } catch {
    return undefined;
  }
};
