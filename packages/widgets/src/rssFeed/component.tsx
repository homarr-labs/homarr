import React from "react";
import { Card, Flex, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.scss";

export default function RssFeed({ serverData, options }: WidgetComponentProps<"rssFeed">) {
  if (serverData?.initialData === undefined) {
    return <span>No data</span>; // TODO: Add proper message here
  }

  const entries = serverData.initialData
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
    <ScrollArea className="scroll-area-w100" w="100%" p={"sm"}>
      <Stack w={"100%"} gap={"xs"}>
        {entries.map((feedEntry) => (
          <Card
            key={feedEntry.id}
            withBorder
            component={"a"}
            href={feedEntry.link}
            radius="md"
            target="_blank"
            w="100%"
          >
            {feedEntry.enclosure && (
              <img className={classes.backgroundImage} src={feedEntry.enclosure} alt="backdrop" />
            )}

            <Flex gap={2} direction="column" w="100%">
              <Text lineClamp={2}>{feedEntry.title}</Text>
              {feedEntry.description && (
                <Text
                  className={feedEntry.description}
                  c="dimmed"
                  size="xs"
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
  <Group mt={4} gap="xs">
    <IconClock size={14} />
    <Text size="xs" c="dimmed">
      {date}
    </Text>
  </Group>
);
