"use client";

import type { ReactNode } from "react";
import { Alert, Card, Flex, Group, Image, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconClock } from "@tabler/icons-react";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "@homarr/common/url";

import classes from "./component.module.scss";

export interface RssFeedEntryDisplay {
  id: string;
  link?: string;
  title?: string;
  description?: string;
  published?: string;
  feedUrl: string;
  enclosure?: string;
}

export interface RssFeedNativeViewProps {
  entries: RssFeedEntryDisplay[];
  options: { enableRtl: boolean; textLinesClamp: number; hideDescription: boolean; showPosterImage: boolean };
  width: number;
  height: number;
  displayMode?: "compact" | "advanced";
  itemRadius: string;
  warning?: string;
  emptyState: ReactNode;
  formatRelativeDate: (value: string) => string;
  formatTimestamp: (value: string) => string;
}

export function RssFeedNativeView({
  entries,
  options,
  width,
  height,
  displayMode,
  itemRadius,
  warning,
  emptyState,
  formatRelativeDate,
  formatTimestamp,
}: RssFeedNativeViewProps) {
  if (entries.length === 0) {
    return (
      <Flex direction="column" h="100%" p="xs">
        {warning && (
          <Alert
            role="presentation"
            color="orange"
            icon={<IconAlertTriangle aria-hidden size="var(--mantine-font-size-md)" />}
            p="xs"
          >
            <output>{warning}</output>
          </Alert>
        )}
        {emptyState}
      </Flex>
    );
  }

  const languageDir = options.enableRtl ? "RTL" : "LTR";

  const isDense = width < 420 || height < 180;
  const isTiny = width < 260 || height < 110;
  const isRoomy = width >= 420 && height >= 240;
  const isAdvanced = displayMode === "advanced";
  const columns = width >= 720 && height >= 260 ? 2 : 1;
  const descriptionLines = isRoomy ? Math.max(options.textLinesClamp, 6) : isDense ? 1 : options.textLinesClamp;
  const entryDisplay = getRssEntryDisplay({
    isAdvanced,
    isDense,
    isTiny,
    hideDescription: options.hideDescription,
    showPosterImage: options.showPosterImage,
    descriptionLines,
  });
  const spacing = isRoomy ? "sm" : "xs";
  const isNarrow = width < 128 * 3;

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" p={isAdvanced ? (isTiny ? 4 : "xs") : "sm"}>
      {warning && (
        <Alert
          role="presentation"
          color="orange"
          icon={<IconAlertTriangle aria-hidden size="var(--mantine-font-size-md)" />}
          p="xs"
          mb="xs"
        >
          <output>{warning}</output>
        </Alert>
      )}
      {isAdvanced ? (
        <SimpleGrid cols={columns} w="100%" spacing={spacing} verticalSpacing={spacing}>
          {entries.map((feedEntry) => {
            const href = getSafeApplicationUrl(feedEntry.link, { baseUrl: feedEntry.feedUrl });
            return (
              <Card
                key={feedEntry.id}
                className={classes.entry}
                component={href ? "a" : "div"}
                href={href}
                radius={itemRadius}
                target={href ? "_blank" : undefined}
                rel={href ? SAFE_NEW_TAB_REL : undefined}
                w="100%"
                p={isDense ? 6 : "xs"}
                title={feedEntry.title}
              >
                <Group wrap="nowrap" align="flex-start" gap={isDense ? "xs" : "md"}>
                  {feedEntry.enclosure !== undefined && entryDisplay.showImage && (
                    <Image
                      loading="lazy"
                      className={classes.poster}
                      src={feedEntry.enclosure}
                      alt=""
                      w={isRoomy ? 140 : isDense ? 64 : 96}
                      h={isRoomy ? 96 : isDense ? 64 : 96}
                      radius="sm"
                      fit="cover"
                    />
                  )}

                  <Flex gap={isRoomy ? "sm" : 6} direction="column" w="100%" miw={0}>
                    <Text dir={languageDir} fz={isRoomy ? "md" : "sm"} fw={600} lh={1.25}>
                      {feedEntry.title}
                    </Text>
                    {entryDisplay.showDescription && feedEntry.description && (
                      <Text dir={languageDir} c="dimmed" size="sm">
                        {feedDescriptionToText(feedEntry.description)}
                      </Text>
                    )}

                    <InfoDisplay
                      source={entryDisplay.showSource ? getHostname(feedEntry.feedUrl) : undefined}
                      date={feedEntry.published ? formatRelativeDate(feedEntry.published) : undefined}
                      timestamp={feedEntry.published ? formatTimestamp(feedEntry.published) : undefined}
                    />
                  </Flex>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      ) : (
        <Stack w="100%" gap="sm">
          {entries.map((feedEntry) => {
            const href = getSafeApplicationUrl(feedEntry.link, { baseUrl: feedEntry.feedUrl });
            return (
              <Card
                key={feedEntry.id}
                component={href ? "a" : "div"}
                href={href}
                radius={itemRadius}
                target={href ? "_blank" : undefined}
                rel={href ? SAFE_NEW_TAB_REL : undefined}
                w="100%"
                p="sm"
                title={feedEntry.title}
              >
                {feedEntry.enclosure !== undefined && (
                  <Image className={classes.backgroundImage} src={feedEntry.enclosure} alt="" />
                )}
                <Group wrap="nowrap">
                  {feedEntry.enclosure !== undefined && options.showPosterImage && !isNarrow && (
                    <Image
                      loading="lazy"
                      className={classes.poster}
                      src={feedEntry.enclosure}
                      alt={feedEntry.title}
                      w={140}
                      h={140}
                      radius="sm"
                      fit="cover"
                    />
                  )}
                  <Flex gap="sm" direction="column" w="100%" miw={0}>
                    <Text dir={languageDir} fz="sm" lh="sm" lineClamp={2}>
                      {feedEntry.title}
                    </Text>
                    {!options.hideDescription && feedEntry.description && (
                      <Text dir={languageDir} c="dimmed" size="sm" lineClamp={options.textLinesClamp}>
                        {feedDescriptionToText(feedEntry.description)}
                      </Text>
                    )}
                    {feedEntry.published && <InfoDisplay date={formatRelativeDate(feedEntry.published)} />}
                  </Flex>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}
    </ScrollArea>
  );
}

export const feedDescriptionToText = (description: string): string => {
  if (typeof DOMParser !== "undefined") {
    return new DOMParser().parseFromString(description, "text/html").body.textContent?.trim() ?? "";
  }
  return description
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const getHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

interface RssEntryDisplayInput {
  isAdvanced: boolean;
  isDense: boolean;
  isTiny: boolean;
  hideDescription: boolean;
  showPosterImage: boolean;
  descriptionLines: number;
}

export const getRssEntryDisplay = ({
  isAdvanced,
  isDense,
  isTiny,
  hideDescription,
  showPosterImage,
  descriptionLines,
}: RssEntryDisplayInput) => ({
  showDescription: isAdvanced || (!hideDescription && !isTiny),
  showImage: isAdvanced || (showPosterImage && !isTiny),
  showSource: isAdvanced || !isDense,
  descriptionLineClamp: isAdvanced ? undefined : descriptionLines,
});

const InfoDisplay = ({ date, timestamp, source }: { date?: string; timestamp?: string; source?: string }) => (
  <Group gap={5} align="center" wrap={timestamp ? "wrap" : "nowrap"}>
    {date && <IconClock size="1rem" color="var(--mantine-color-dimmed)" />}
    {date && (
      <Text size="xs" c="dimmed">
        {date}
      </Text>
    )}
    {timestamp && <Text c="dimmed">•</Text>}
    {timestamp && (
      <Text size="xs" c="dimmed" ff="monospace">
        {timestamp}
      </Text>
    )}
    {(date || timestamp) && source && <Text c="dimmed">•</Text>}
    {source && (
      <Text size="xs" c="dimmed" truncate="end">
        {source}
      </Text>
    )}
  </Group>
);
