"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  Anchor,
  Box,
  Card,
  Flex,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconLink } from "@tabler/icons-react";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { MaskedOrNormalImage } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { getSafeApplicationUrl, getSafeAppHref, SAFE_NEW_TAB_REL } from "../common/application-url";
import { getUsableWidgetQueryData } from "../common/query-state";
import classes from "./bookmark.module.css";

type BookmarkLayout = WidgetComponentProps<"bookmarks">["options"]["layout"];

export interface BookmarkDisplayItem {
  id: string;
  name: string;
  description: string | null;
  iconUrl?: string;
  href: string | null;
}

export interface CompactBookmarkLayout {
  columns: number;
  hideHostname: boolean;
  hideTitle: boolean;
  minimumItemSize: number;
}

export function getCompactBookmarkLayout(
  width: number,
  height: number,
  itemCount: number,
  layout: BookmarkLayout,
): CompactBookmarkLayout {
  const count = Math.max(1, itemCount);
  const isGrid = layout === "grid" || layout === "gridHorizontal";
  const targetWidth = layout === "gridHorizontal" ? 180 : 104;
  const columns = isGrid ? Math.max(1, Math.min(count, Math.floor(width / targetWidth))) : layout === "row" ? count : 1;
  const rows = Math.max(1, Math.ceil(count / columns));
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const usesHorizontalItems = layout === "column" || layout === "gridHorizontal";

  return {
    columns,
    hideHostname: cellWidth < 120 || cellHeight < (usesHorizontalItems ? 52 : 96),
    hideTitle: cellWidth < 64 || cellHeight < 40,
    minimumItemSize: usesHorizontalItems ? 48 : 96,
  };
}

export default function BookmarksWidget({
  options,
  itemId,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"bookmarks">) {
  const board = useRequiredBoard();
  const apps =
    getUsableWidgetQueryData(
      clientApi.app.byIds.useQuery(options.items, {
        select(selectedApps) {
          return selectedApps.toSorted((appA, appB) => options.items.indexOf(appA.id) - options.items.indexOf(appB.id));
        },
      }),
    ) ?? [];
  const customLinks = useMemo(
    () => options.customUrls.flatMap((url) => createCustomBookmark(url) ?? []),
    [options.customUrls],
  );
  const data: BookmarkDisplayItem[] = [...apps, ...customLinks];

  useRegisterSpotlightContextResults(
    `bookmark-${itemId}`,
    data.flatMap((app) => {
      const href = getSafeAppHref(app.href);
      return href
        ? [
            {
              id: app.id,
              name: app.name,
              icon: app.iconUrl ?? IconLink,
              interaction() {
                return {
                  type: "link",
                  href,
                  newTab: false,
                };
              },
            },
          ]
        : [];
    }),
    [data],
  );

  const compactLayout = useMemo(
    () => getCompactBookmarkLayout(width, height, data.length, options.layout),
    [width, height, data.length, options.layout],
  );
  const compactHideTitle = options.hideTitle || (compactLayout.hideTitle && !options.hideIcon);
  const compactHideHostname =
    options.hideHostname || (compactLayout.hideHostname && !(options.hideTitle && options.hideIcon));

  return (
    <Stack h="100%" mih={0} gap="sm" p={height < 120 ? "xs" : "sm"}>
      {options.title.length > 0 && (
        <Title order={4} px="0.25rem" lineClamp={displayMode === "advanced" ? undefined : 1}>
          {options.title}
        </Title>
      )}
      {displayMode === "advanced" && (
        <AdvancedBookmarksLayout
          data={data}
          width={width}
          openNewTab={options.openNewTab}
          withBorder={options.withBorder}
          hasIconColor={board.iconColor !== null}
        />
      )}
      {displayMode !== "advanced" && (
        <ScrollArea type="auto" scrollbarSize={6} offsetScrollbars style={{ flex: 1, minHeight: 0 }}>
          <Box mih="100%">
            {options.layout === "grid" || options.layout === "gridHorizontal" ? (
              <GridLayout
                data={data}
                columns={compactLayout.columns}
                minimumItemHeight={compactLayout.minimumItemSize}
                itemDirection={options.layout === "gridHorizontal" ? "horizontal" : "vertical"}
                hideTitle={compactHideTitle}
                hideIcon={options.hideIcon}
                hideHostname={compactHideHostname}
                openNewTab={options.openNewTab}
                withBorder={options.withBorder}
                hasIconColor={board.iconColor !== null}
              />
            ) : (
              <FlexLayout
                data={data}
                direction={options.layout}
                minimumItemSize={compactLayout.minimumItemSize}
                hideTitle={compactHideTitle}
                hideIcon={options.hideIcon}
                hideHostname={compactHideHostname}
                openNewTab={options.openNewTab}
                withBorder={options.withBorder}
                hasIconColor={board.iconColor !== null}
              />
            )}
          </Box>
        </ScrollArea>
      )}
    </Stack>
  );
}

interface FlexLayoutProps {
  data: BookmarkDisplayItem[];
  direction: "row" | "column";
  hideTitle: boolean;
  hideIcon: boolean;
  hideHostname: boolean;
  openNewTab: boolean;
  withBorder: boolean;
  hasIconColor: boolean;
  minimumItemSize: number;
}

const FlexLayout = ({
  data,
  direction,
  hideTitle,
  hideIcon,
  hideHostname,
  openNewTab,
  withBorder,
  hasIconColor,
  minimumItemSize,
}: FlexLayoutProps) => {
  const board = useRequiredBoard();
  return (
    <Flex direction={direction} gap={4} w="100%" mih="100%" wrap="nowrap">
      {data.map((app) => {
        const href = getSafeAppHref(app.href);
        return (
          <div key={app.id} style={{ display: "flex", flex: `1 0 ${minimumItemSize}px`, flexDirection: direction }}>
            <UnstyledButton
              className={classes.bookmarkButton}
              component={href ? "a" : "div"}
              href={href}
              target={href ? (openNewTab ? "_blank" : "_self") : undefined}
              rel={href && openNewTab ? SAFE_NEW_TAB_REL : undefined}
              key={app.id}
              w="100%"
            >
              <Card
                radius={board.itemRadius}
                className={classes.card}
                w="100%"
                display="flex"
                p={4}
                h="100%"
                withBorder={withBorder}
              >
                {direction === "row" ? (
                  <VerticalItem
                    app={app}
                    hideTitle={hideTitle}
                    hideIcon={hideIcon}
                    hideHostname={hideHostname}
                    hasIconColor={hasIconColor}
                  />
                ) : (
                  <HorizontalItem
                    app={app}
                    hideTitle={hideTitle}
                    hideIcon={hideIcon}
                    hideHostname={hideHostname}
                    hasIconColor={hasIconColor}
                  />
                )}
              </Card>
            </UnstyledButton>
          </div>
        );
      })}
    </Flex>
  );
};

interface AdvancedBookmarksLayoutProps {
  data: BookmarkDisplayItem[];
  width: number;
  openNewTab: boolean;
  withBorder: boolean;
  hasIconColor: boolean;
}

export const getAdvancedBookmarkColumns = (width: number, itemCount: number): number =>
  Math.max(1, Math.min(itemCount || 1, Math.floor(width / 280)));

export const getBookmarkHostname = (href: string | null): string | undefined => {
  const safeHref = getSafeApplicationUrl(href);
  return safeHref ? new URL(safeHref).hostname : undefined;
};

export const createCustomBookmark = (url: string): BookmarkDisplayItem | null => {
  const normalizedUrl = url.trim();
  const href = getSafeAppHref(normalizedUrl);
  if (!href) return null;

  return {
    id: `custom-link:${normalizedUrl}`,
    name: getBookmarkHostname(href) ?? normalizedUrl,
    description: null,
    href,
  };
};

const AdvancedBookmarksLayout = ({
  data,
  width,
  openNewTab,
  withBorder,
  hasIconColor,
}: AdvancedBookmarksLayoutProps) => {
  const board = useRequiredBoard();

  return (
    <ScrollArea h="100%" style={{ flex: 1 }}>
      <SimpleGrid cols={getAdvancedBookmarkColumns(width, data.length)} spacing="sm">
        {data.map((app) => {
          const href = getSafeAppHref(app.href);
          return (
            <UnstyledButton
              key={app.id}
              className={classes.bookmarkButton}
              component={href ? "a" : "div"}
              href={href}
              target={href ? (openNewTab ? "_blank" : "_self") : undefined}
              rel={href && openNewTab ? SAFE_NEW_TAB_REL : undefined}
            >
              <Card radius={board.itemRadius} className={classes.card} withBorder={withBorder} p="md" h="100%">
                <Group align="flex-start" wrap="nowrap">
                  <BookmarkIcon
                    app={app}
                    hasColor={hasIconColor}
                    className={classes.bookmarkIcon}
                    style={{ width: 40, height: 40, flex: "0 0 auto" }}
                  />
                  <Stack gap={3} miw={0}>
                    <Text fw={700} size="sm">
                      {app.name}
                    </Text>
                    <Anchor component="span" size="xs" truncate="end">
                      {getBookmarkHostname(app.href)}
                    </Anchor>
                    {app.description && (
                      <Text size="xs" c="dimmed">
                        {app.description}
                      </Text>
                    )}
                  </Stack>
                </Group>
              </Card>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </ScrollArea>
  );
};

interface GridLayoutProps {
  data: BookmarkDisplayItem[];
  hideTitle: boolean;
  hideIcon: boolean;
  hideHostname: boolean;
  openNewTab: boolean;
  withBorder: boolean;
  itemDirection: "horizontal" | "vertical";
  hasIconColor: boolean;
  columns: number;
  minimumItemHeight: number;
}

const GridLayout = ({
  data,
  hideTitle,
  hideIcon,
  hideHostname,
  openNewTab,
  withBorder,
  itemDirection,
  hasIconColor,
  columns,
  minimumItemHeight,
}: GridLayoutProps) => {
  const board = useRequiredBoard();

  return (
    <SimpleGrid
      cols={columns}
      spacing={4}
      verticalSpacing={4}
      miw="100%"
      mih="100%"
      style={{ gridAutoRows: `minmax(${minimumItemHeight}px, 1fr)` }}
    >
      {data.map((app) => {
        const href = getSafeAppHref(app.href);
        return (
          <UnstyledButton
            className={classes.bookmarkButton}
            component={href ? "a" : "div"}
            href={href}
            target={href ? (openNewTab ? "_blank" : "_self") : undefined}
            rel={href && openNewTab ? SAFE_NEW_TAB_REL : undefined}
            key={app.id}
            h="100%"
          >
            <Card
              h="100%"
              className={combineClasses(classes.card, classes["card-grid"])}
              radius={board.itemRadius}
              withBorder={withBorder}
              p="xs"
            >
              {itemDirection === "horizontal" ? (
                <HorizontalItem
                  app={app}
                  hideTitle={hideTitle}
                  hideIcon={hideIcon}
                  hideHostname={hideHostname}
                  hasIconColor={hasIconColor}
                />
              ) : (
                <VerticalItem
                  app={app}
                  hideTitle={hideTitle}
                  hideIcon={hideIcon}
                  hideHostname={hideHostname}
                  hasIconColor={hasIconColor}
                />
              )}
            </Card>
          </UnstyledButton>
        );
      })}
    </SimpleGrid>
  );
};

const VerticalItem = ({
  app,
  hideTitle,
  hideIcon,
  hideHostname,
  hasIconColor,
}: {
  app: BookmarkDisplayItem;
  hideTitle: boolean;
  hideIcon: boolean;
  hideHostname: boolean;
  hasIconColor: boolean;
}) => {
  return (
    <Stack h="100%" miw={16} gap="sm" justify={"center"}>
      {!hideTitle && (
        <Text fw={700} ta="center" size="xs" lineClamp={2}>
          {app.name}
        </Text>
      )}
      {!hideIcon && (
        <BookmarkIcon
          app={app}
          hasColor={hasIconColor}
          className={classes.bookmarkIcon}
          style={{
            width: hideHostname && hideTitle ? "min(max(100%, 16px), 40px)" : 40,
            height: hideHostname && hideTitle ? "min(max(100%, 16px), 40px)" : 40,
            overflow: "auto",
            flex: "unset",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        />
      )}
      {!hideHostname && (
        <Anchor ta="center" component="span" size="xs" truncate="end" w="100%">
          {getBookmarkHostname(app.href)}
        </Anchor>
      )}
    </Stack>
  );
};

const HorizontalItem = ({
  app,
  hideTitle,
  hideIcon,
  hideHostname,
  hasIconColor,
}: {
  app: BookmarkDisplayItem;
  hideTitle: boolean;
  hideIcon: boolean;
  hideHostname: boolean;
  hasIconColor: boolean;
}) => {
  return (
    <Group wrap="nowrap" gap="xs" h="100%" justify="start">
      {!hideIcon && (
        <BookmarkIcon
          app={app}
          hasColor={hasIconColor}
          className={classes.bookmarkIcon}
          style={{
            overflow: "auto",
            width: hideHostname ? 16 : 24,
            height: hideHostname ? 16 : 24,
            flex: "unset",
          }}
        />
      )}
      {!(hideTitle && hideHostname) && (
        <>
          <Stack justify="space-between" gap={0} miw={0} style={{ flex: 1 }}>
            {!hideTitle && (
              <Text fw={700} size="xs" lineClamp={hideHostname ? 2 : 1}>
                {app.name}
              </Text>
            )}

            {!hideHostname && (
              <Anchor component="span" size="xs" truncate="end">
                {getBookmarkHostname(app.href)}
              </Anchor>
            )}
          </Stack>
        </>
      )}
    </Group>
  );
};

interface BookmarkIconProps {
  app: BookmarkDisplayItem;
  hasColor: boolean;
  className?: string;
  style?: CSSProperties;
}

const BookmarkIcon = ({ app, hasColor, className, style }: BookmarkIconProps) =>
  app.iconUrl ? (
    <MaskedOrNormalImage
      imageUrl={app.iconUrl}
      hasColor={hasColor}
      alt={app.name}
      className={className}
      style={style}
    />
  ) : (
    <IconLink aria-label={app.name} className={className} style={style} />
  );
