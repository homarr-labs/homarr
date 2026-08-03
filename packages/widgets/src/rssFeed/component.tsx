"use client";

import { Alert, Card, Flex, Group, Image, ScrollArea, SimpleGrid, Text } from "@mantine/core";
import { IconAlertTriangle, IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import classes from "./component.module.scss";

const useLiveFeed = (input: RouterInputs["widget"]["rssFeed"]["getFeeds"]) => {
  const { data, error } = clientApi.widget.rssFeed.getFeeds.useQuery(input);
  if (error && data === undefined) throw error;

  // Persisted query caches can still contain the array response used before failed-feed metadata was added.
  const normalizedData = data as typeof data | RouterOutputs["widget"]["rssFeed"]["getFeeds"]["entries"];
  if (Array.isArray(normalizedData)) {
    return {
      entries: normalizedData,
      failedFeedCount: 0,
      isStale: Boolean(error),
    };
  }

  return {
    entries: normalizedData?.entries ?? [],
    failedFeedCount: normalizedData?.failedFeedCount ?? 0,
    isStale: Boolean(error),
  };
};

export default function RssFeed({ options, width, height }: WidgetComponentProps<"rssFeed">) {
  const {
    entries: feedEntries,
    failedFeedCount,
    isStale,
  } = useLiveFeed({
    urls: options.feedUrls,
    maximumAmountPosts: typeof options.maximumAmountPosts === "number" ? options.maximumAmountPosts : 100,
  });

  const board = useRequiredBoard();
  const t = useScopedI18n("widget.rssFeed");
  const warning = isStale
    ? t("warning.stale")
    : failedFeedCount > 0
      ? t("warning.partial", { count: failedFeedCount })
      : undefined;

  const languageDir = options.enableRtl ? "RTL" : "LTR";

  const isDense = width < 420 || height < 180;
  const isTiny = width < 260 || height < 110;
  const isRoomy = width >= 420 && height >= 240;
  const columns = width >= 720 && height >= 260 ? 2 : 1;
  const descriptionLines = isRoomy ? Math.max(options.textLinesClamp, 6) : isDense ? 1 : options.textLinesClamp;
  const spacing = isRoomy ? "sm" : "xs";

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" p={isTiny ? 4 : "xs"}>
      {warning && (
        <Alert role="presentation" color="orange" icon={<IconAlertTriangle aria-hidden size={16} />} p="xs" mb="xs">
          <output>{warning}</output>
        </Alert>
      )}
      <SimpleGrid cols={columns} w="100%" spacing={spacing} verticalSpacing={spacing}>
        {feedEntries.map((feedEntry) => {
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
                {feedEntry.enclosure !== undefined && options.showPosterImage && !isTiny && (
                  <Image
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
                  <Text dir={languageDir} fz={isRoomy ? "md" : "sm"} fw={600} lh={1.25} lineClamp={2}>
                    {feedEntry.title}
                  </Text>
                  {!options.hideDescription && feedEntry.description && !isTiny && (
                    <Text dir={languageDir} c="dimmed" size="sm" lineClamp={descriptionLines}>
                      {feedDescriptionToText(feedEntry.description)}
                    </Text>
                  )}

                  <InfoDisplay
                    source={!isDense ? getHostname(feedEntry.feedUrl) : undefined}
                    date={feedEntry.published ? dayjs(feedEntry.published).fromNow() : undefined}
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

const InfoDisplay = ({ date, source }: { date?: string; source?: string }) => (
  <Group gap={5} align="center" wrap="nowrap">
    {date && <IconClock size="1rem" color="var(--mantine-color-dimmed)" />}
    {date && (
      <Text size="xs" c="dimmed">
        {date}
      </Text>
    )}
    {date && source && <Text c="dimmed">•</Text>}
    {source && (
      <Text size="xs" c="dimmed" truncate="end">
        {source}
      </Text>
    )}
  </Group>
);
