import { Badge, Box, Button, darken, Group, Image, lighten, ScrollArea, Stack, Text } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { CalendarEvent } from "@homarr/integrations/types";

import classes from "./calendar-event-list.module.css";

interface CalendarEventListProps {
  events: CalendarEvent[];
}

export const CalendarEventList = ({ events }: CalendarEventListProps) => {
  return (
    <ScrollArea
      offsetScrollbars
      pt={5}
      w={400}
      styles={{
        viewport: {
          maxHeight: 450,
          minHeight: 210,
        },
      }}
    >
      <Stack>
        {events.map((event, eventIndex) => (
          <Group key={eventIndex} align={"stretch"} wrap="nowrap">
            <Box pos={"relative"} w={70} h={120}>
              <Image src={event.thumbnail} w={70} h={120} radius={"sm"} />
              {event.mediaInformation?.type === "tv" && (
                <Badge
                  pos={"absolute"}
                  bottom={-6}
                  left={"50%"}
                  className={classes.badge}
                >{`S${event.mediaInformation.seasonNumber} / E${event.mediaInformation.episodeNumber}`}</Badge>
              )}
            </Box>
            <Stack style={{ flexGrow: 1 }} gap={0}>
              <Group justify={"space-between"} align={"start"} mb={"xs"} wrap="nowrap">
                <Stack gap={0}>
                  {event.subName && <Text lineClamp={1} size="sm">{event.subName}</Text>}
                  <Text fw={"bold"} lineClamp={1}>
                    {event.name}
                  </Text>
                </Stack>
                <Group gap={3} wrap="nowrap">
                  <IconClock opacity={0.7} size={"1rem"} />
                  <Text c={"dimmed"}>{dayjs(event.date.toString()).format("HH:mm")}</Text>
                </Group>
              </Group>
              {event.description && (
                <Text size={"xs"} color={"dimmed"} lineClamp={2}>
                  {event.description}
                </Text>
              )}
              {event.links.length > 0 && (
                <Group pt={5} gap={5} mt={"auto"} wrap="nowrap">
                  {event.links.map((link) => (
                    <Button
                      component={"a"}
                      href={link.href.toString()}
                      target={"_blank"}
                      size={"xs"}
                      radius={"xl"}
                      variant={link.color ? undefined : "default"}
                      styles={{
                        root: {
                          backgroundColor: link.color,
                          color: link.isDark ? "white" : "black",
                          "&:hover":
                            link.isDark && link.color
                              ? {
                                  backgroundColor: link.isDark ? lighten(link.color, 0.1) : darken(link.color, 0.1),
                                }
                              : undefined,
                        },
                      }}
                      leftSection={link.logo ? <Image src={link.logo} w={20} h={20} /> : undefined}
                    >
                      <Text>{link.name}</Text>
                    </Button>
                  ))}
                </Group>
              )}
            </Stack>
          </Group>
        ))}
      </Stack>
    </ScrollArea>
  );
};
