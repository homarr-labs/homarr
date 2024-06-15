import { Box, Button, darken, Group, Image, Indicator, lighten, ScrollArea, Stack, Text } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { CalendarEvent } from "@homarr/integrations/types";

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
            <Box w={70} h={120}>
              <Indicator
                position={"bottom-center"}
                disabled={event.mediaInformation?.type !== "tv"}
                label={`S${event.mediaInformation?.seasonNumber} / E${event.mediaInformation?.episodeNumber}`}
                withBorder
              >
                <Image src={event.thumbnail} w={70} h={120} radius={"sm"} />
              </Indicator>
            </Box>
            <Stack style={{ flexGrow: 1 }} gap={0}>
              <Group justify={"apart"} align={"start"} mb={"xs"} wrap="nowrap">
                <Stack gap={0}>
                  {event.subName && <Text lineClamp={1}>{event.subName}</Text>}
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
