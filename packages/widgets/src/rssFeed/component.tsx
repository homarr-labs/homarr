import React from "react";
import { Card, Flex, Group, Image, ScrollArea, Stack, Text } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.scss";

export default function RssFeed({ options, itemId }: WidgetComponentProps<"rssFeed">) {
  const [rssFeeds] = clientApi.widget.rssFeed.getFeeds.useSuspenseQuery(
    {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      itemId: itemId!,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
      select(data) {
        return data?.data ?? [];
      },
    },
  );

  const entries = rssFeeds
    .filter((feedGroup) => feedGroup.feed.entries !== undefined)
    .flatMap((feedGroup) => feedGroup.feed.entries)
    .filter((entry) => entry !== undefined)
    .sort((entryA, entryB) => {
      if (!entryA.published || !entryB.published) {
        return -1;
      }
      return new Date(entryB.published).getTime() - new Date(entryA.published).getTime();
    })
    .slice(0, options.maximumAmountPosts as number);

  return (
    <ScrollArea className="scroll-area-w100" w="100%" p="4cqmin">
      <Stack w={"100%"} gap="4cqmin">
        {entries.map((feedEntry) => (
          <Card
            key={feedEntry.id}
            withBorder
            component={"a"}
            href={feedEntry.link}
            radius="2.5cqmin"
            target="_blank"
            w="100%"
            p="2.5cqmin"
          >
            {feedEntry.enclosure && (
              <Image className={classes.backgroundImage} src={feedEntry.enclosure} alt="backdrop" />
            )}

            <Flex gap="2.5cqmin" direction="column" w="100%">
              <Text fz="4cqmin" lh="5cqmin" lineClamp={2}>
                {feedEntry.title}
              </Text>
              {feedEntry.description && (
                <Text
                  className={feedEntry.description}
                  c="dimmed"
                  size="3.5cqmin"
                  lineClamp={options.textLinesClamp as number}
                  dangerouslySetInnerHTML={{ __html: feedEntry.description }}
                />
              )}

              {feedEntry.published && <InfoDisplay date={dayjs(feedEntry.published).fromNow()} />}
            </Flex>
          </Card>
        ))}
      </Stack>
    </ScrollArea>
  );
}

const InfoDisplay = ({ date }: { date: string }) => (
  <Group gap="2.5cqmin">
    <IconClock size="2.5cqmin" />
    <Text size="2.5cqmin" c="dimmed" pt="1cqmin">
      {date}
    </Text>
  </Group>
);
