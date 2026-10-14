"use client";

import { useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ActionIcon, Box, Center, Group, Loader, Stack, Text, Tooltip } from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { useElementSize } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { ScopedTranslationFunction } from "@homarr/translation";
import type { CalendarProps } from "@mantine/dates";

import actionTargetClasses from "../common/action-target.module.css";
import type { WidgetComponentProps } from "../definition";
import { CalendarDayView } from "./native-view-day";
import {
  getCalendarAgendaEvents,
  groupEventsByDate,
  moveCalendarMonth,
  splitEvents,
  toCalendarDateKey,
} from "./calendar-events";
import type { CalendarEventWithSource, CalendarEventListViewProps } from "./native-view-event-list";
import { CalendarEventListView } from "./native-view-event-list";
import classes from "./component.module.css";

export interface CalendarViewProps {
  isEditMode: boolean;
  events: CalendarEventWithSource[];
  failedIntegrations: { integrationId: string; integrationName: string; error: string }[];
  isPending: boolean;
  month: Date;
  setMonth: (date: Date) => void;
  options: WidgetComponentProps<"calendar">["options"];
  displayMode?: WidgetComponentProps<"calendar">["displayMode"];
  locale: string;
  firstDayOfWeek: CalendarProps["firstDayOfWeek"];
  actualItemRadius: CSSProperties["borderRadius"];
  queryIndicators: ReactNode;
  t: ScopedTranslationFunction<"widget.calendar.advanced">;
  eventListProps: Pick<CalendarEventListViewProps, "t" | "bindings" | "colorScheme">;
}

export const CalendarView = ({
  isEditMode,
  events,
  failedIntegrations,
  isPending,
  month,
  setMonth,
  options,
  displayMode,
  locale,
  firstDayOfWeek,
  actualItemRadius,
  queryIndicators,
  t,
  eventListProps,
}: CalendarViewProps) => {
  const { ref, width, height } = useElementSize();
  const isSmall = width < 256;

  const normalizedEvents = useMemo(
    () => (displayMode === "advanced" ? [] : splitEvents(events)),
    [displayMode, events],
  );
  const visibleEvents = useMemo(
    () =>
      normalizedEvents.filter(
        (event) => event.metadata?.type !== "radarr" || options.releaseType.includes(event.metadata.releaseType),
      ),
    [normalizedEvents, options.releaseType],
  );
  const eventsByDate = useMemo(() => groupEventsByDate(visibleEvents), [visibleEvents]);
  const agendaEvents = useMemo(
    () => (displayMode === "advanced" ? getCalendarAgendaEvents(events, month, options.releaseType) : []),
    [displayMode, events, month, options.releaseType],
  );

  if (displayMode === "advanced") {
    return (
      <CalendarAgenda
        events={agendaEvents}
        isPending={isPending}
        isEditMode={isEditMode}
        locale={locale}
        month={month}
        setMonth={setMonth}
        queryIndicators={queryIndicators}
        t={t}
        eventListProps={eventListProps}
      />
    );
  }

  return (
    <Box ref={ref} h="100%" w="100%" pos="relative" style={{ overflow: "hidden" }}>
      <Calendar
        defaultDate={new Date()}
        onPreviousMonth={(previousMonth) => setMonth(new Date(previousMonth))}
        onNextMonth={(nextMonth) => setMonth(new Date(nextMonth))}
        highlightToday
        locale={locale}
        hideWeekdays={false}
        date={month}
        maxLevel="month"
        firstDayOfWeek={firstDayOfWeek}
        className={classes.calendar}
        w="100%"
        h="100%"
        styles={{
          calendarHeaderControl: {
            borderRadius: "md",
            height: isSmall ? "1.5rem" : undefined,
            width: isSmall ? "1.5rem" : undefined,
          },
          calendarHeaderLevel: {
            pointerEvents: "none",
            fontSize: isSmall ? "0.75rem" : undefined,
            height: "100%",
          },
          levelsGroup: {
            height: "100%",
            padding: "md",
          },
          calendarHeader: {
            maxWidth: "unset",
            marginBottom: 0,
          },
          monthCell: {
            textAlign: "center",
            position: "relative",
            padding: 3,
          },
          day: {
            borderRadius: actualItemRadius,
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          },
          month: {
            height: "100%",
          },
          weekday: {
            padding: 0,
          },
          weekdaysRow: {
            height: 22,
          },
        }}
        renderDay={(tileDate) => {
          const eventsForDate = eventsByDate.get(toCalendarDateKey(dayjs(tileDate).toDate())) ?? [];

          return (
            <CalendarDayView
              date={dayjs(tileDate).toDate()}
              events={eventsForDate}
              disabled={eventsForDate.length === 0}
              rootWidth={width}
              rootHeight={height}
              actualItemRadius={actualItemRadius}
              eventList={<CalendarEventListView events={eventsForDate} locale={locale} {...eventListProps} />}
            />
          );
        }}
      />
      {failedIntegrations.length > 0 && (
        <Group className={classes.errorIndicator} gap={0} pos="absolute">
          {queryIndicators}
        </Group>
      )}
    </Box>
  );
};

interface CalendarAgendaProps {
  events: CalendarEventWithSource[];
  isPending: boolean;
  isEditMode: boolean;
  locale: string;
  month: Date;
  setMonth: (date: Date) => void;
  queryIndicators: ReactNode;
  t: CalendarViewProps["t"];
  eventListProps: CalendarViewProps["eventListProps"];
}

const CalendarAgenda = ({
  events,
  isPending,
  isEditMode,
  locale,
  month,
  setMonth,
  queryIndicators,
  t,
  eventListProps,
}: CalendarAgendaProps) => {
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);

  return (
    <Stack h="100%" w="100%" gap="sm" p="md" style={{ overflow: "hidden" }}>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Tooltip label={t("previousMonth")} events={{ hover: true, focus: true, touch: false }}>
            <ActionIcon
              className={actionTargetClasses.root}
              variant="subtle"
              size="lg"
              aria-label={t("previousMonth")}
              disabled={isEditMode}
              onClick={() => setMonth(moveCalendarMonth(month, -1))}
            >
              <IconChevronLeft size="var(--mantine-font-size-lg)" aria-hidden />
            </ActionIcon>
          </Tooltip>
          <Stack gap={0} miw={0}>
            <Text component="h3" size="sm" fw={600} tt="capitalize" lineClamp={1}>
              {monthLabel}
            </Text>
            <Text size="xs" c="dimmed">
              {isPending ? t("loading") : t("eventCount", { count: events.length })}
            </Text>
          </Stack>
          <Tooltip label={t("nextMonth")} events={{ hover: true, focus: true, touch: false }}>
            <ActionIcon
              className={actionTargetClasses.root}
              variant="subtle"
              size="lg"
              aria-label={t("nextMonth")}
              disabled={isEditMode}
              onClick={() => setMonth(moveCalendarMonth(month, 1))}
            >
              <IconChevronRight size="var(--mantine-font-size-lg)" aria-hidden />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Group gap={0}>{queryIndicators}</Group>
      </Group>

      <Box style={{ flex: 1, minHeight: 0 }}>
        {isPending ? (
          <Center component="output" h="100%" aria-label={t("loading")}>
            <Loader size="sm" />
          </Center>
        ) : events.length > 0 ? (
          <CalendarEventListView events={events} advanced groupByDate locale={locale} fillHeight {...eventListProps} />
        ) : (
          <Stack h="100%" align="center" justify="center" p="md">
            <Text c="dimmed" size="sm" ta="center">
              {t("noEvents")}
            </Text>
          </Stack>
        )}
      </Box>
    </Stack>
  );
};
