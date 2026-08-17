"use client";

import { Alert, Card, Flex, Group, Image, ScrollArea, SimpleGrid, Text } from "@mantine/core";
import { IconAlertTriangle, IconClock, IconServerOff } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { WidgetEmptyState } from "../common/empty-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { BaseWidgetError } from "../errors/base-component";
import classes from "./component.module.scss";

const useLiveFeed = (input: RouterInputs["widget"]["rssFeed"]["getFeeds"]) => {
  const query = clientApi.widget.rssFeed.getFeeds.useQuery(input);
  if (query.error && query.data === undefined) {
    return { hasError: true as const, refetch: query.refetch };
  }

  // Persisted query caches can still contain the array response used before failed-feed metadata was added.
  const normalizedData = query.data as typeof query.data | RouterOutputs["widget"]["rssFeed"]["getFeeds"]["entries"];
  if (Array.isArray(normalizedData)) {
    return {
      hasError: false as const,
      entries: normalizedData,
      failedFeedCount: 0,
      isPending: query.isPending,
      isStale: Boolean(query.error),
    };
  }

  return {
    hasError: false as const,
    entries: normalizedData?.entries ?? [],
    failedFeedCount: normalizedData?.failedFeedCount ?? 0,
    isPending: query.isPending,
    isStale: Boolean(query.error),
  };
};

export default function RssFeed({ options, width, height, displayMode }: WidgetComponentProps<"rssFeed">) {
  const feed = useLiveFeed({
    urls: options.feedUrls,
    maximumAmountPosts: typeof options.maximumAmountPosts === "number" ? options.maximumAmountPosts : 100,
  });

  const board = useRequiredBoard();
  const t = useScopedI18n("widget.rssFeed");
  if (feed.hasError) {
    return (
      <BaseWidgetError
        icon={IconServerOff}
        message={t("error.allFeedsFailed")}
        showLogsLink
        onRetry={() => void feed.refetch()}
      />
    );
  }
  if (feed.isPending) return <WidgetQueryLoadingState />;

  const warning = feed.isStale
    ? t("warning.stale")
    : feed.failedFeedCount > 0
      ? t("warning.partial", { count: feed.failedFeedCount })
      : undefined;

  if (feed.entries.length === 0) {
    return (
      <Flex direction="column" h="100%" p="xs">
        {warning && (
          <Alert role="presentation" color="orange" icon={<IconAlertTriangle aria-hidden style={iconSizes.md} />} p="xs">
            <output>{warning}</output>
          </Alert>
        )}
        <WidgetEmptyState />
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

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" p={isTiny ? 4 : "xs"}>
      {warning && (
        <Alert role="presentation" color="orange" icon={<IconAlertTriangle aria-hidden style={iconSizes.md} />} p="xs" mb="xs">
          <output>{warning}</output>
        </Alert>
      )}
      <SimpleGrid cols={columns} w="100%" spacing={spacing} verticalSpacing={spacing}>
        {feed.entries.map((feedEntry) => {
          const href = getSafeApplicationUrl(feedEntry.link, { baseUrl: feedEntry.feedUrl });
          return (
            <Card
              key={feedEntry.id}
              className={classes.entry}
              component={href ? "a" : "div"}
              href={href}
              radius={board.itemRadius}
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
                  <Text
                    dir={languageDir}
                    fz={isRoomy ? "md" : "sm"}
                    fw={600}
                    lh={1.25}
                    lineClamp={isAdvanced ? undefined : 2}
                  >
                    {feedEntry.title}
                  </Text>
                  {entryDisplay.showDescription && feedEntry.description && (
                    <Text dir={languageDir} c="dimmed" size="sm" lineClamp={entryDisplay.descriptionLineClamp}>
                      {feedDescriptionToText(feedEntry.description)}
                    </Text>
                  )}

                  <InfoDisplay
                    source={entryDisplay.showSource ? getHostname(feedEntry.feedUrl) : undefined}
                    date={feedEntry.published ? dayjs(feedEntry.published).fromNow() : undefined}
                    timestamp={
                      isAdvanced && feedEntry.published
                        ? dayjs(feedEntry.published).format("YYYY-MM-DD HH:mm:ss Z")
                        : undefined
                    }
                  />
                </Flex>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>
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
