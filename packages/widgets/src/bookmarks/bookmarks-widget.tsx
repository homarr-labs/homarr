"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Avatar,
  Box,
  Card,
  Center,
  CopyButton,
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
import { useLocalStorage, useReducedMotion } from "@mantine/hooks";
import { IconArrowUpRight, IconBookmark, IconCheck, IconCopy, IconExternalLink, IconLink } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";
import { iconSizes, zoomCompensatedSize } from "@homarr/ui";

import { SAFE_NEW_TAB_REL } from "../common/application-url";
import actionTargetClasses from "../common/action-target.module.css";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import {
  createDirectBookmark,
  getBookmarkAddressText,
  getBookmarkFaviconUrl,
  getDirectBookmarkUrl,
} from "./bookmark-item";
import type { BookmarkItem } from "./bookmark-item";
import { getBookmarkCardDisplay, getBookmarkDisplayPlan } from "./layout";
import type { BookmarkOrientation } from "./layout";
import { getBookmarkGroups } from "./groups-data";

type BookmarkVariant = WidgetComponentProps<"bookmarks">["options"]["variant"];

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
  if (showTitle) {
    // Preserve the existing header allowance at 11px and account for the selected line height.
    titleHeight = 36 + (options.titleSize - 11) * 1.2;
  }
  const contentHeight = Math.max(0, responsiveHeight - titleHeight);
  const isTight = responsiveHeight < 120;
  let contentPadding = 12;
  if (isTight) contentPadding = 6;
  let layoutHeight = contentHeight;
  let layoutItemCount = data.length;
  if (!advanced && options.layout === "column") {
    layoutHeight = Math.max(0, responsiveHeight - contentPadding * 2 - 2);
    if (showTitle) layoutHeight = Math.max(0, layoutHeight - options.titleSize * 1.2 - contentPadding);
    if (sections.length > 0) {
      const expandedSections = sections.filter((section) => !collapsedGroups.includes(section.id));
      layoutItemCount =
        ungroupedItems.length + expandedSections.reduce((count, section) => count + section.items.length, 0);
      layoutHeight -= sections.length * bookmarkGroupControlHeight + expandedSections.length * bookmarkGroupSpacing;
      let visibleListCount = expandedSections.length;
      if (ungroupedItems.length > 0) {
        layoutHeight -= bookmarkUngroupedHeadingHeight + bookmarkGroupSpacing * 2;
        visibleListCount += 1;
      }
      layoutHeight += Math.max(0, visibleListCount - 1) * Math.min(bookmarkSpacingPixels[options.spacing], 4);
      layoutHeight = Math.max(0, layoutHeight);
    }
  }
  let layoutWidth = responsiveWidth;
  if (options.layout === "gridHorizontal") layoutWidth = width;

  useRegisterSpotlightContextResults(
    `bookmark-${itemId}`,
    data.flatMap((bookmark) => {
      const href = bookmark.href;
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
        gap: bookmarkSpacingPixels[options.spacing],
        height: layoutHeight,
        hideHostname: options.hideHostname,
        itemCount: layoutItemCount,
        layout: options.layout,
        showFullUrls: options.showFullUrls,
        width: layoutWidth,
      }),
    [
      advanced,
      layoutHeight,
      layoutItemCount,
      layoutWidth,
      options.hideHostname,
      options.layout,
      options.showFullUrls,
      options.spacing,
    ],
  );

  const cardDisplay = getBookmarkCardDisplay({
    advanced,
    hideHostname: options.hideHostname,
    hideIcon: options.hideIcon,
    hideTitle: options.hideTitle,
    plan,
    showFullUrls: options.showFullUrls,
  });

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
        showFullUrls={options.showFullUrls}
        variant={options.variant}
        withBorder={options.withBorder}
        radius={board.itemRadius}
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

  if (appIds.length > 0 && isInitialWidgetQueryPending(appsQuery)) return <WidgetQueryLoadingState />;

  let compactStyle: CSSProperties | undefined;
  if (!advanced && Number.isFinite(displayScale) && displayScale > 1) {
    // Low-column boards zoom the canvas above 100%. Keep bookmark controls at their intended physical size.
    // The spacing and font tokens are rebound here because their inherited values resolve at the canvas level.
    compactStyle = {
      "--board-canvas-ui-scale": 1 / displayScale,
      "--mantine-scale": 1 / displayScale,
      "--mantine-font-size-xxs": "calc(0.6875rem * var(--board-canvas-ui-scale))",
      "--mantine-spacing-sm": "calc(0.75rem * var(--board-canvas-ui-scale))",
      "--mantine-spacing-xs": "calc(0.625rem * var(--board-canvas-ui-scale))",
    } as CSSProperties;
  }

  return (
    <Stack h="100%" mih={0} gap={contentPadding} p={contentPadding} style={compactStyle}>
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
              {t("empty")}
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
              <Stack gap={bookmarkGroupSpacing}>
                <Accordion
                  multiple
                  value={sections
                    .filter((section) => !collapsedGroups.includes(section.id))
                    .map((section) => section.id)}
                  onChange={(opened) => {
                    const visibleIds = new Set(sections.map((section) => section.id));
                    setCollapsedGroups((current) => [
                      ...current.filter((id) => !visibleIds.has(id)),
                      ...sections.filter((section) => !opened.includes(section.id)).map((section) => section.id),
                    ]);
                  }}
                  transitionDuration={0}
                  styles={{
                    control: { padding: rem(bookmarkGroupSpacing), minHeight: rem(bookmarkGroupControlHeight) },
                    label: { padding: 0, fontSize: "var(--mantine-font-size-xxs)", fontWeight: 600 },
                    content: { padding: `0 0 ${rem(bookmarkGroupSpacing)}` },
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
                  <Stack gap={bookmarkGroupSpacing}>
                    <Text size="xxs" fw={600} px={bookmarkGroupSpacing} lh={rem(bookmarkUngroupedHeadingHeight)}>
                      {t("groups.ungrouped")}
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

interface BookmarkCardProps {
  advanced: boolean;
  bookmark: BookmarkItem;
  height: number;
  openNewTab: boolean;
  orientation: BookmarkOrientation;
  radius: string;
  showFullUrls: boolean;
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
  showFullUrls,
  showHostname,
  showIcon,
  showTitle,
  variant,
  width,
  withBorder,
}: BookmarkCardProps) => {
  const [active, setActive] = useState(false);
  const reduceMotion = useReducedMotion();
  const href = bookmark.href ?? undefined;
  const address = href ? getBookmarkAddressText(href, showFullUrls) : undefined;
  const iconUrl = bookmark.iconUrl ?? getBookmarkFaviconUrl(bookmark.href);
  const iconOnly = orientation === "icon" || (!showTitle && !showHostname);
  const showUrlActions = showFullUrls && showHostname && Boolean(href);
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
  // 11px (12px advanced) with medium weight; icon-only and ultra-dense rows omit this line.
  const addressSize = advanced ? 12 : 11;
  const vertical = orientation === "vertical" && !advanced;

  const hostnameLine = showHostname ? (
    <Text fz={addressSize} fw={500} lh={1.2} c="dimmed" ta={vertical ? "center" : undefined} truncate w="100%">
      {address}
    </Text>
  ) : null;
  const fullUrlLine =
    showUrlActions && href && address ? (
      <BookmarkFullUrlLine address={address} href={href} openNewTab={openNewTab} size={addressSize} />
    ) : null;

  const content = vertical ? (
    <Stack h="100%" align={showUrlActions ? "stretch" : "center"} justify="center" gap={6} flex={1} w="100%">
      {showUrlActions && href ? (
        <BookmarkOpenLink
          href={href}
          openNewTab={openNewTab}
          label={bookmark.name}
          style={{ flexDirection: "column", alignItems: "center", gap: 6 }}
        >
          {showIcon ? <BookmarkAvatar bookmark={bookmark} iconUrl={iconUrl} size={iconOnly ? 34 : 38} /> : null}
          {showTitle ? (
            <Text size="xxs" fw={600} lh={1.2} ta="center" lineClamp={2}>
              {bookmark.name}
            </Text>
          ) : null}
        </BookmarkOpenLink>
      ) : (
        <>
          {showIcon ? <BookmarkAvatar bookmark={bookmark} iconUrl={iconUrl} size={iconOnly ? 34 : 38} /> : null}
          {showTitle ? (
            <Text size="xxs" fw={600} lh={1.2} ta="center" lineClamp={2}>
              {bookmark.name}
            </Text>
          ) : null}
          {hostnameLine}
        </>
      )}
      {fullUrlLine}
    </Stack>
  ) : showUrlActions && href ? (
    <Stack h="100%" gap={advanced ? 3 : 0} justify="center" flex={1} w="100%" miw={0}>
      <BookmarkOpenLink
        href={href}
        openNewTab={openNewTab}
        label={bookmark.name}
        style={{ gap: advanced ? "var(--mantine-spacing-sm)" : "var(--mantine-spacing-xs)", width: "100%" }}
      >
        {showIcon ? <BookmarkAvatar bookmark={bookmark} iconUrl={iconUrl} size={avatarSize} /> : null}
        {showTitle ? (
          <Text size={advanced ? "xs" : "xxs"} fw={600} lh={1.2} truncate style={{ flex: 1, minWidth: 0 }}>
            {bookmark.name}
          </Text>
        ) : null}
      </BookmarkOpenLink>
      {fullUrlLine}
      {advanced && bookmark.description ? (
        <Text fz={10} c="dimmed" lineClamp={2}>
          {bookmark.description}
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
      w="100%"
    >
      {showIcon ? <BookmarkAvatar bookmark={bookmark} iconUrl={iconUrl} size={avatarSize} /> : null}
      {!iconOnly ? (
        <Stack gap={advanced ? 3 : 0} miw={0} flex={1}>
          {showTitle ? (
            <Text size={advanced ? "xs" : "xxs"} fw={600} lh={1.2} truncate>
              {bookmark.name}
            </Text>
          ) : null}
          {hostnameLine}
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
          {address ? (
            <Text size="xs" opacity={0.8} style={{ wordBreak: "break-all" }}>
              {address}
            </Text>
          ) : null}
        </Stack>
      }
      openDelay={450}
      disabled={advanced || showUrlActions}
      withArrow
    >
      <Card
        component={showUrlActions || !href ? "div" : "a"}
        href={showUrlActions ? undefined : href}
        target={showUrlActions || !href ? undefined : openNewTab ? "_blank" : "_self"}
        rel={showUrlActions || !href || !openNewTab ? undefined : SAFE_NEW_TAB_REL}
        aria-label={showUrlActions ? undefined : bookmark.name}
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
            cursor: href && !showUrlActions ? "pointer" : "default",
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

const BookmarkOpenLink = ({
  children,
  href,
  label,
  openNewTab,
  style,
}: {
  children: ReactNode;
  href: string;
  label: string;
  openNewTab: boolean;
  style?: CSSProperties;
}) => (
  <Box
    component="a"
    href={href}
    target={openNewTab ? "_blank" : "_self"}
    rel={openNewTab ? SAFE_NEW_TAB_REL : undefined}
    aria-label={label}
    style={{
      alignItems: "center",
      color: "inherit",
      display: "flex",
      minWidth: 0,
      textDecoration: "none",
      ...style,
    }}
  >
    {children}
  </Box>
);

const BookmarkFullUrlLine = ({
  address,
  href,
  openNewTab,
  size,
}: {
  address: string;
  href: string;
  openNewTab: boolean;
  size: number;
}) => (
  <Group gap={2} wrap="nowrap" align="center" miw={0} w="100%">
    <Box miw={0} style={{ flex: "1 1 auto" }}>
      <Tooltip
        label={
          <Text size="xs" style={{ wordBreak: "break-all" }}>
            {href}
          </Text>
        }
        openDelay={450}
        multiline
        maw={360}
        withArrow
      >
        <Text
          component="a"
          href={href}
          target={openNewTab ? "_blank" : "_self"}
          rel={openNewTab ? SAFE_NEW_TAB_REL : undefined}
          fz={size}
          fw={500}
          lh={1.2}
          c="dimmed"
          truncate
          w="100%"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          {address}
        </Text>
      </Tooltip>
    </Box>
    <BookmarkUrlActions href={href} openNewTab={openNewTab} />
  </Group>
);

const BookmarkUrlActions = ({ href, openNewTab }: { href: string; openNewTab: boolean }) => {
  const t = useI18n("widget.bookmarks");

  return (
    <Group gap={2} wrap="nowrap" style={{ flexShrink: 0 }}>
      <CopyButton value={href} timeout={1500}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? t("copied") : t("copyUrl")} withArrow {...(copied ? { opened: true } : {})}>
            <ActionIcon
              className={actionTargetClasses.root}
              variant="subtle"
              color={copied ? "teal" : "gray"}
              size="xs"
              aria-label={t("copyUrl")}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                copy();
              }}
            >
              {copied ? <IconCheck style={iconSizes.xs} /> : <IconCopy style={iconSizes.xs} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
      <Tooltip label={t("openUrl")} withArrow>
        <ActionIcon
          className={actionTargetClasses.root}
          component="a"
          href={href}
          target={openNewTab ? "_blank" : "_self"}
          rel={openNewTab ? SAFE_NEW_TAB_REL : undefined}
          variant="subtle"
          color="gray"
          size="xs"
          aria-label={t("openUrl")}
          onClick={(event) => event.stopPropagation()}
        >
          <IconExternalLink style={iconSizes.xs} />
        </ActionIcon>
      </Tooltip>
    </Group>
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

const bookmarkSpacingPixels = {
  xs: 10,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 32,
} as const;

const bookmarkGroupControlHeight = 28;
const bookmarkGroupSpacing = 4;
const bookmarkUngroupedHeadingHeight = 18;
