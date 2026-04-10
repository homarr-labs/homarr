"use client";

import { Card, Flex, Group, Image, ScrollArea, Stack, Text } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { RouterInputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.scss";

const useLiveFeedEntries = (input: RouterInputs["widget"]["rssFeed"]["getFeeds"]) => {
  const [feedEntries] = clientApi.widget.rssFeed.getFeeds.useSuspenseQuery(input, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  const utils = clientApi.useUtils();

  clientApi.widget.rssFeed.subscribeFeeds.useSubscription(input, {
    onData(updatedData) {
      utils.widget.rssFeed.getFeeds.setData(input, (oldData) => {
        return oldData
          ?.filter((entry) => entry.feedUrl !== updatedData.url)
          .concat(updatedData.entries)
          .sort((entryA, entryB) => {
            return entryA.published && entryB.published
              ? new Date(entryB.published).getTime() - new Date(entryA.published).getTime()
              : 0;
          })
          .slice(0, input.maximumAmountPosts);
      });
    },
  });

  return feedEntries;
};

export default function RssFeed({ options, width }: WidgetComponentProps<"rssFeed">) {
  const feedEntries = useLiveFeedEntries({
    urls: options.feedUrls,
    maximumAmountPosts: typeof options.maximumAmountPosts === "number" ? options.maximumAmountPosts : 100,
  });

  const board = useRequiredBoard();

  const languageDir = options.enableRtl ? "RTL" : "LTR";

  const isNarrow = width < 128 * 3;

  return (
    <ScrollArea className="scroll-area-w100" w="100%" p="sm">
      <Stack w={"100%"} gap="sm">
        {feedEntries.map((feedEntry) => (
          <Card
            key={feedEntry.id}
            withBorder
            component={"a"}
            href={feedEntry.link}
            radius={board.itemRadius}
            target="_blank"
            w="100%"
            p="sm"
          >
            {feedEntry.enclosure !== undefined && (
              <Image className={classes.backgroundImage} src={feedEntry.enclosure} alt="backdrop" />
            )}

            <Group wrap="nowrap">
              {feedEntry.enclosure !== undefined && options.showPosterImage && !isNarrow && (
                <Image src={feedEntry.enclosure} alt={feedEntry.title} w={140} h={140} radius="sm" />
              )}

              <Flex gap="sm" direction="column" w="100%">
                <Text dir={languageDir} fz="sm" lh="sm" lineClamp={2}>
                  {feedEntry.title}
                </Text>
                {!options.hideDescription && feedEntry.description && (
                  <Text
                    className={feedEntry.description}
                    dir={languageDir}
                    c="dimmed"
                    size="sm"
                    lineClamp={options.textLinesClamp}
                    dangerouslySetInnerHTML={{ __html: feedEntry.description }}
                  />
                )}

                {feedEntry.published && <InfoDisplay date={dayjs(feedEntry.published).fromNow()} />}
              </Flex>
            </Group>
          </Card>
        ))}
      </Stack>
    </ScrollArea>
  );
}

const InfoDisplay = ({ date }: { date: string }) => (
  <Group gap={5} align={"center"}>
    <IconClock size={"1rem"} color={"var(--mantine-color-dimmed)"} />
    <Text size="sm" c="dimmed">
      {date}
    </Text>
  </Group>
);
