"use client";

import { Alert, Card, Flex, Group, Image, ScrollArea, SimpleGrid, Text } from "@mantine/core";
import { IconAlertTriangle, IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
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

export default function RssFeed({ options, width, height, displayMode }: WidgetComponentProps<"rssFeed">) {
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

  const isAdvanced = displayMode === "advanced";
  const isDense = !isAdvanced && (width < 420 || height < 180);
  const isTiny = !isAdvanced && (width < 260 || height < 110);
  const columns = isAdvanced && width >= 720 ? 2 : 1;
  const descriptionLines = isAdvanced ? Math.max(options.textLinesClamp, 8) : isDense ? 1 : options.textLinesClamp;

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" p={isAdvanced ? "md" : isTiny ? 4 : "xs"}>
      {warning && (
        <Alert role="presentation" color="orange" icon={<IconAlertTriangle aria-hidden size={16} />} p="xs" mb="xs">
          <output>{warning}</output>
        </Alert>
      )}
      <SimpleGrid cols={columns} w="100%" spacing={isAdvanced ? "md" : "xs"} verticalSpacing={isAdvanced ? "md" : "xs"}>
        {feedEntries.map((feedEntry) => (
          <Card
            key={feedEntry.id}
            className={classes.entry}
            component={"a"}
            href={getSafeExternalUrl(feedEntry.link, feedEntry.feedUrl)}
            radius={board.itemRadius}
            target="_blank"
            rel="noopener noreferrer"
            w="100%"
            p={isAdvanced ? "md" : isDense ? 6 : "xs"}
            title={feedEntry.title}
          >
            <Group wrap="nowrap" align="flex-start" gap={isDense ? "xs" : "md"}>
              {feedEntry.enclosure !== undefined && options.showPosterImage && !isTiny && (
                <Image
                  className={classes.poster}
                  src={feedEntry.enclosure}
                  alt=""
                  w={isAdvanced ? 180 : isDense ? 64 : 96}
                  h={isAdvanced ? 120 : isDense ? 64 : 96}
                  radius="sm"
                  fit="cover"
                />
              )}

              <Flex gap={isAdvanced ? "sm" : 6} direction="column" w="100%" miw={0}>
                <Text dir={languageDir} fz={isAdvanced ? "md" : "sm"} fw={600} lh={1.25} lineClamp={2}>
                  {feedEntry.title}
                </Text>
                {!options.hideDescription && feedEntry.description && !isTiny && (
                  <Text dir={languageDir} c="dimmed" size="sm" lineClamp={descriptionLines}>
                    {feedDescriptionToText(feedEntry.description)}
                  </Text>
                )}

                <InfoDisplay
                  source={isAdvanced || !isDense ? getHostname(feedEntry.feedUrl) : undefined}
                  date={feedEntry.published ? dayjs(feedEntry.published).fromNow() : undefined}
                />
              </Flex>
            </Group>
          </Card>
        ))}
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

export const getSafeExternalUrl = (value: unknown, baseUrl?: string): string | undefined => {
  if (typeof value !== "string") return undefined;
  try {
    let sanitizedBaseUrl: string | undefined;
    if (baseUrl) {
      const parsedBaseUrl = new URL(baseUrl);
      parsedBaseUrl.username = "";
      parsedBaseUrl.password = "";
      parsedBaseUrl.search = "";
      parsedBaseUrl.hash = "";
      sanitizedBaseUrl = parsedBaseUrl.toString();
    }

    const url = new URL(value, sanitizedBaseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return undefined;
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
