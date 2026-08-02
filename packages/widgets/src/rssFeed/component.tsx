"use client";

import { Card, Flex, Group, Image, ScrollArea, SimpleGrid, Text } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { RouterInputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.scss";

const useLiveFeedEntries = (input: RouterInputs["widget"]["rssFeed"]["getFeeds"]) => {
  const { data: feedEntries = [], error } = clientApi.widget.rssFeed.getFeeds.useQuery(input);
  if (error) throw error;

  return feedEntries;
};

export default function RssFeed({ options, width, displayMode }: WidgetComponentProps<"rssFeed">) {
  const feedEntries = useLiveFeedEntries({
    urls: options.feedUrls,
    maximumAmountPosts: typeof options.maximumAmountPosts === "number" ? options.maximumAmountPosts : 100,
  });

  const board = useRequiredBoard();

  const languageDir = options.enableRtl ? "RTL" : "LTR";

  const isAdvanced = displayMode === "advanced";
  const isNarrow = !isAdvanced && width < 128 * 3;
  const columns = isAdvanced && width >= 720 ? 2 : 1;

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" p={isAdvanced ? "md" : "xs"}>
      <SimpleGrid cols={columns} w="100%" spacing={isAdvanced ? "md" : "xs"} verticalSpacing={isAdvanced ? "md" : "xs"}>
        {feedEntries.map((feedEntry) => (
          <Card
            key={feedEntry.id}
            component={"a"}
            href={getSafeExternalUrl(feedEntry.link, feedEntry.feedUrl) ?? getSafeExternalUrl(feedEntry.feedUrl)}
            radius={board.itemRadius}
            target="_blank"
            rel="noopener noreferrer"
            w="100%"
            p={isAdvanced ? "md" : "xs"}
          >
            {feedEntry.enclosure !== undefined && (
              <Image className={classes.backgroundImage} src={feedEntry.enclosure} alt="backdrop" />
            )}

            <Group wrap="nowrap" align="flex-start">
              {feedEntry.enclosure !== undefined && options.showPosterImage && !isNarrow && (
                <Image
                  src={feedEntry.enclosure}
                  alt={feedEntry.title}
                  w={isAdvanced ? 180 : 112}
                  h={isAdvanced ? 120 : 112}
                  radius="sm"
                  fit="cover"
                />
              )}

              <Flex gap={isAdvanced ? "sm" : 6} direction="column" w="100%" miw={0}>
                <Text dir={languageDir} fz={isAdvanced ? "md" : "sm"} fw={600} lh={1.25} lineClamp={2}>
                  {feedEntry.title}
                </Text>
                {!options.hideDescription && feedEntry.description && (
                  <Text
                    dir={languageDir}
                    c="dimmed"
                    size="sm"
                    lineClamp={isAdvanced ? Math.max(options.textLinesClamp, 8) : options.textLinesClamp}
                  >
                    {feedDescriptionToText(feedEntry.description)}
                  </Text>
                )}

                <InfoDisplay
                  source={isAdvanced ? getHostname(feedEntry.feedUrl) : undefined}
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
    const url = new URL(value, baseUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
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
