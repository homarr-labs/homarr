"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import {
  Accordion,
  Avatar,
  Box,
  Card,
  Center,
  Grid,
  Group,
  rem,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { IconArrowUpRight, IconBookmark, IconLink } from "@tabler/icons-react";

import { getSafeAppHref, SAFE_NEW_TAB_REL } from "@homarr/common/url";

import type { BookmarkCardDisplay, BookmarkDisplayPlan, BookmarkItem, BookmarkOrientation } from "./native-view-types";

type BookmarkVariant = "soft" | "filled" | "outline" | "plain";

interface BookmarkPresentationHelpers {
  getBookmarkFaviconUrl: (href: string | null) => string | undefined;
  zoomCompensatedSize: (size: number) => CSSProperties;
  iconSizes: { sm: CSSProperties; xl: CSSProperties };
}

export interface BookmarksNativeViewProps extends BookmarkPresentationHelpers {
  options: {
    title: string;
    titleSize: number;
    grow: boolean;
    openNewTab: boolean;
    variant: BookmarkVariant;
    withBorder: boolean;
  };
  data: BookmarkItem[];
  sections: { id: string; name: string; items: BookmarkItem[] }[];
  ungroupedItems: BookmarkItem[];
  collapsedGroups: string[];
  onGroupsChange: (opened: string[]) => void;
  plan: BookmarkDisplayPlan;
  cardDisplay: BookmarkCardDisplay;
  advanced: boolean;
  showTitle: boolean;
  responsiveHeight: number;
  displayScale?: number;
  radius: string;
  labels: { empty: string; ungrouped: string };
}

export function BookmarksNativeView({
  options,
  data,
  sections,
  ungroupedItems,
  collapsedGroups,
  onGroupsChange,
  plan,
  cardDisplay,
  advanced,
  showTitle,
  responsiveHeight,
  radius,
  labels,
  getBookmarkFaviconUrl,
  zoomCompensatedSize,
  iconSizes,
  displayScale = 1,
}: BookmarksNativeViewProps) {
  const renderCards = (items: BookmarkItem[]) =>
    items.map((bookmark) => (
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
        radius={radius}
        getBookmarkFaviconUrl={getBookmarkFaviconUrl}
        zoomCompensatedSize={zoomCompensatedSize}
        iconSizes={iconSizes}
        height={plan.itemHeight}
        width={plan.horizontalScroll ? plan.itemWidth : undefined}
      />
    ));

  const renderItems = (items: BookmarkItem[]) => {
    const cards = renderCards(items);
    if (plan.horizontalScroll)
      return (
        <Group gap={plan.itemGap} wrap="nowrap" align="center" h="100%">
          {cards}
        </Group>
      );
    if (options.grow)
      return (
        <Grid grow columns={plan.columns} gap={plan.itemGap}>
          {cards.map((card) => (
            <Grid.Col key={card.key} span={1}>
              {card}
            </Grid.Col>
          ))}
        </Grid>
      );
    return (
      <SimpleGrid cols={plan.columns} spacing={plan.itemGap} verticalSpacing={plan.itemGap}>
        {cards}
      </SimpleGrid>
    );
  };

  const isTight = responsiveHeight < 120;
  let compactStyle: (CSSProperties & Record<`--${string}`, string | number>) | undefined;
  if (!advanced && Number.isFinite(displayScale) && displayScale > 1) {
    compactStyle = {
      "--board-canvas-ui-scale": 1 / displayScale,
      "--mantine-scale": 1 / displayScale,
      "--mantine-font-size-xxs": "calc(0.6875rem * var(--board-canvas-ui-scale))",
      "--mantine-spacing-sm": "calc(0.75rem * var(--board-canvas-ui-scale))",
      "--mantine-spacing-xs": "calc(0.625rem * var(--board-canvas-ui-scale))",
    };
  }

  return (
    <Stack h="100%" mih={0} gap={isTight ? 6 : "sm"} p={isTight ? 6 : "sm"} style={compactStyle}>
      {showTitle && (
        <Text fz={options.titleSize} fw={600} px={2} lh={1.2} lineClamp={1} style={{ flexShrink: 0 }}>
          {options.title}
        </Text>
      )}

      {data.length === 0 ? (
        <Center flex={1}>
          <Stack align="center" gap={6}>
            <ThemeIcon variant="light" size="lg" radius="xl">
              <IconBookmark style={iconSizes.xl} />
            </ThemeIcon>
            <Text size="sm" c="dimmed" ta="center">
              {labels.empty}
            </Text>
          </Stack>
        </Center>
      ) : (
        <ScrollArea
          scrollbars={sections.length > 0 ? "xy" : plan.horizontalScroll ? "x" : "y"}
          style={{ flex: 1, minHeight: 0 }}
          styles={{ content: { height: "100%" } }}
        >
          <Box miw="100%" h="100%" pb={2}>
            {sections.length > 0 ? (
              <Stack gap={4}>
                <Accordion
                  multiple
                  value={sections
                    .filter((section) => !collapsedGroups.includes(section.id))
                    .map((section) => section.id)}
                  onChange={onGroupsChange}
                  transitionDuration={0}
                  styles={{
                    control: { padding: rem(4), minHeight: rem(28) },
                    label: { padding: 0, fontSize: "var(--mantine-font-size-xxs)", fontWeight: 600 },
                    content: { padding: `0 0 ${rem(4)}` },
                    item: { border: 0 },
                    chevron: zoomCompensatedSize(14),
                  }}
                >
                  {sections.map((section) => (
                    <Accordion.Item key={section.id} value={section.id}>
                      <Accordion.Control>
                        <Group justify="space-between" gap={4} wrap="nowrap">
                          <Text inherit truncate>
                            {section.name}
                          </Text>
                          <Text inherit c="dimmed">
                            {section.items.length}
                          </Text>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>{renderItems(section.items)}</Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
                {ungroupedItems.length > 0 && (
                  <Stack gap={4}>
                    <Text size="xxs" fw={600} px={4}>
                      {labels.ungrouped}
                    </Text>
                    {renderItems(ungroupedItems)}
                  </Stack>
                )}
              </Stack>
            ) : (
              renderItems(data)
            )}
          </Box>
        </ScrollArea>
      )}
    </Stack>
  );
}

interface BookmarkCardProps extends BookmarkPresentationHelpers {
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
  getBookmarkFaviconUrl,
  zoomCompensatedSize,
  iconSizes,
}: BookmarkCardProps) => {
  const [active, setActive] = useState(false);
  const reduceMotion = useReducedMotion();
  const href = getSafeAppHref(bookmark.href);
  const hostname = bookmark.href ? getBookmarkHostname(bookmark.href) : undefined;
  const iconUrl = bookmark.iconUrl ?? getBookmarkFaviconUrl(bookmark.href);
  const iconOnly = orientation === "icon" || (!showTitle && !showHostname);
  const background = getBookmarkBackground(variant, active);
  const isUltraDense = height <= 32;
  const isDense = height <= 48;
  let avatarSize = 30;
  if (isDense) avatarSize = 28;
  if (isUltraDense) avatarSize = 20;
  if (iconOnly && !isDense) avatarSize = 32;
  if (advanced) avatarSize = 42;
  let padding: number | "xs" | "md" = "xs";
  if (isDense || iconOnly) padding = 6;
  if (isUltraDense) padding = 4;
  if (advanced) padding = "md";

  const content =
    orientation === "vertical" && !advanced ? (
      <Stack h="100%" align="center" justify="center" gap={6} flex={1}>
        {showIcon ? (
          <BookmarkAvatar
            bookmark={bookmark}
            iconUrl={iconUrl}
            size={iconOnly ? 34 : 38}
            zoomCompensatedSize={zoomCompensatedSize}
          />
        ) : null}
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
          <BookmarkAvatar
            bookmark={bookmark}
            iconUrl={iconUrl}
            size={avatarSize}
            zoomCompensatedSize={zoomCompensatedSize}
          />
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
        p={padding}
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

const BookmarkAvatar = ({
  bookmark,
  iconUrl,
  size,
  zoomCompensatedSize,
}: {
  bookmark: BookmarkItem;
  iconUrl?: string;
  size: number;
  zoomCompensatedSize: BookmarkPresentationHelpers["zoomCompensatedSize"];
}) => (
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
