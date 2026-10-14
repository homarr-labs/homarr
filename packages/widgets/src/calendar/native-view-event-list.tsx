import { useId } from "react";
import { Badge, Box, Button, darken, Group, Image, lighten, ScrollArea, Stack, Text } from "@mantine/core";
import { IconClock, IconPin } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { CalendarEvent } from "@homarr/integrations/types";
import type { ScopedTranslationFunction } from "@homarr/translation";
import type { MediaNavigationBindings } from "../rendering/media";
import type { isNullOrWhitespace } from "@homarr/common";
import type { formatLocalizedTime } from "../common/locale";

import { groupEventsByDate } from "./calendar-events";
import classes from "./calendar-event-list.module.css";

export type CalendarEventWithSource = CalendarEvent & {
  source?: { integrationId: string; integrationName: string };
};

export interface CalendarEventListViewProps {
  events: CalendarEventWithSource[];
  advanced?: boolean;
  fillHeight?: boolean;
  groupByDate?: boolean;
  locale: string;
  colorScheme: "light" | "dark" | "auto";
  t: ScopedTranslationFunction<"widget.calendar">;
  bindings: MediaNavigationBindings & {
    isNullOrWhitespace: typeof isNullOrWhitespace;
    formatLocalizedTime: typeof formatLocalizedTime;
  };
}

export const CalendarEventListView = ({
  events,
  advanced = false,
  fillHeight = false,
  groupByDate = false,
  locale,
  colorScheme,
  t,
  bindings,
}: CalendarEventListViewProps) => {
  const headingIdPrefix = useId();
  const effectiveLocale = locale;
  const dateFormatter = new Intl.DateTimeFormat(effectiveLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const groups = groupByDate ? [...groupEventsByDate(events).entries()] : null;

  return (
    <ScrollArea
      pt={5}
      w="100%"
      h={fillHeight ? "100%" : undefined}
      styles={{
        viewport: {
          maxHeight: fillHeight ? undefined : 450,
        },
      }}
    >
      <Stack gap="md" pb="xs">
        {groups ? (
          groups.map(([date, groupedEvents]) => {
            const headingId = `${headingIdPrefix}-${date}`;
            return (
              <Box key={date} component="section" aria-labelledby={headingId}>
                <Text id={headingId} component="h3" size="sm" fw={600} tt="capitalize">
                  {dateFormatter.format(groupedEvents[0]?.startDate)}
                </Text>
                <Stack mt="xs">
                  <CalendarEventRows
                    events={groupedEvents}
                    locale={effectiveLocale}
                    advanced={advanced}
                    colorScheme={colorScheme}
                    t={t}
                    bindings={bindings}
                  />
                </Stack>
              </Box>
            );
          })
        ) : (
          <CalendarEventRows
            events={events}
            locale={effectiveLocale}
            advanced={advanced}
            colorScheme={colorScheme}
            t={t}
            bindings={bindings}
          />
        )}
      </Stack>
    </ScrollArea>
  );
};

const CalendarEventRows = ({
  events,
  locale,
  advanced,
  colorScheme,
  t,
  bindings,
}: Pick<CalendarEventListViewProps, "events" | "advanced" | "locale" | "colorScheme" | "t" | "bindings">) => {
  const { isNullOrWhitespace, formatLocalizedTime, getSafeApplicationUrl, SAFE_NEW_TAB_REL } = bindings;
  return (
    <>
      {events.map((event, eventIndex) => (
        <Group
          key={`${event.source?.integrationId ?? "event"}-${event.startDate.toISOString()}-${event.title}-${eventIndex}`}
          align={"stretch"}
          wrap="nowrap"
        >
          {event.image !== null && (
            <Box pos="relative">
              <Image
                src={event.image.src}
                w={70}
                mah={150}
                style={{
                  aspectRatio: event.image.aspectRatio
                    ? `${event.image.aspectRatio.width} / ${event.image.aspectRatio.height}`
                    : "1/1",
                }}
                radius="sm"
                fallbackSrc="https://placehold.co/400x400?text=No%20image"
              />
              {event.image.badge !== undefined && (
                <Badge pos="absolute" bottom={-6} left="50%" w="90%" className={classes.badge}>
                  {event.image.badge.content}
                </Badge>
              )}
            </Box>
          )}
          <Stack style={{ flexGrow: 1, minWidth: 0 }} gap={0}>
            <Group justify="space-between" align="start" mb="xs" wrap="wrap">
              <Stack gap={0} style={{ flex: "1 1 12rem", minWidth: 0 }}>
                {event.subTitle !== null && (
                  <Text lineClamp={advanced ? undefined : 1} size="sm">
                    {event.subTitle}
                  </Text>
                )}
                <Text fw={"bold"} lineClamp={advanced ? undefined : 1} size="sm">
                  {event.title}
                </Text>
                {advanced && event.source && (
                  <Badge size="xs" variant="light" w="fit-content">
                    {event.source.integrationName}
                  </Badge>
                )}
              </Stack>
              {event.metadata?.type === "radarr" && (
                <Group wrap="nowrap">
                  <Text c="dimmed" size="sm">
                    {t(`option.releaseType.options.${event.metadata.releaseType}`)}
                  </Text>
                </Group>
              )}

              <Group gap={3} wrap="nowrap" align={"center"} ml="auto">
                <IconClock opacity={0.7} size={"1rem"} />
                {isAllDay(event) ? (
                  <Text c={"dimmed"} size={"sm"}>
                    {t("duration.allDay")}
                  </Text>
                ) : (
                  <>
                    <Text c={"dimmed"} size={"sm"}>
                      {formatLocalizedTime(event.startDate, locale)}
                    </Text>

                    {event.endDate !== null && (
                      <>
                        -{" "}
                        <Text c={"dimmed"} size={"sm"}>
                          {formatLocalizedTime(event.endDate, locale)}
                        </Text>
                      </>
                    )}
                  </>
                )}
              </Group>
            </Group>

            {event.location !== null && (
              <Group gap={4} mb={isNullOrWhitespace(event.description) ? 0 : "sm"}>
                <IconPin opacity={0.7} size={"1rem"} />
                <Text size={"xs"} c={"dimmed"} lineClamp={advanced ? undefined : 1}>
                  {event.location}
                </Text>
              </Group>
            )}

            {!isNullOrWhitespace(event.description) && (
              <Text size={"xs"} c={"dimmed"} lineClamp={advanced ? undefined : 2}>
                {event.description}
              </Text>
            )}

            {event.links.length > 0 && (
              <Group pt={5} gap={5} mt={"auto"} wrap="nowrap">
                {event.links
                  .filter((link) => link.href)
                  .map((link) => {
                    const href = getSafeApplicationUrl(link.href.toString());
                    return (
                      <Button
                        key={link.href}
                        component={href ? "a" : "div"}
                        href={href}
                        target={href ? "_blank" : undefined}
                        rel={href ? SAFE_NEW_TAB_REL : undefined}
                        size={"xs"}
                        radius={"xl"}
                        variant={link.color ? undefined : "default"}
                        styles={{
                          root: {
                            backgroundColor: link.color,
                            color: link.isDark && colorScheme === "dark" ? "white" : "black",
                            "&:hover": link.color
                              ? {
                                  backgroundColor: link.isDark ? lighten(link.color, 0.1) : darken(link.color, 0.1),
                                }
                              : undefined,
                          },
                        }}
                        leftSection={link.logo ? <Image src={link.logo} fit="contain" w={20} h={20} /> : undefined}
                      >
                        <Text>{link.name}</Text>
                      </Button>
                    );
                  })}
              </Group>
            )}
          </Stack>
        </Group>
      ))}
    </>
  );
};

const isAllDay = (event: Pick<CalendarEvent, "startDate" | "endDate">) => {
  if (!event.endDate) return false;

  const start = dayjs(event.startDate);
  const end = dayjs(event.endDate);

  return start.startOf("day").isSame(start) && end.endOf("day").isSame(end);
};
