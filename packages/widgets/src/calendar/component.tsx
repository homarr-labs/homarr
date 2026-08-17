"use client";

import { useMemo, useState } from "react";
import { ActionIcon, Box, Center, Group, Loader, Stack, Text, Tooltip, useMantineTheme } from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { useElementSize } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { getQueryKey } from "@trpc/react-query";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useSettings } from "@homarr/settings";
import { useCurrentIntlLocale, useI18n, useScopedI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import actionTargetClasses from "../common/action-target.module.css";
import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { CalendarDay } from "./calender-day";
import {
  getCalendarAgendaEvents,
  groupEventsByDate,
  moveCalendarMonth,
  splitEvents,
  toCalendarDateKey,
} from "./calendar-events";
import type { CalendarEventWithSource } from "./calendar-event-list";
import { CalendarEventList } from "./calendar-event-list";
import classes from "./component.module.css";

export default function CalendarWidget(props: WidgetComponentProps<"calendar">) {
  const [month, setMonth] = useState(() => new Date());
  const runtimeInput = {
    integrationIds: props.integrationIds,
    month: month.getMonth(),
    year: month.getFullYear(),
    releaseType: props.options.releaseType,
    showUnmonitored: props.options.showUnmonitored,
  };
  useWidgetRuntimeQueries(
    props.widgetRuntimeRef,
    props.integrationIds.length > 0
      ? [getQueryKey(clientApi.widget.calendar.findAllEvents, runtimeInput, "query")]
      : [],
  );

  if (props.integrationIds.length === 0) {
    return (
      <CalendarBase
        {...props}
        events={[]}
        failedIntegrations={[]}
        isPending={false}
        queryError={undefined}
        month={month}
        setMonth={setMonth}
      />
    );
  }

  return <FetchCalendar month={month} setMonth={setMonth} {...props} />;
}

interface FetchCalendarProps extends WidgetComponentProps<"calendar"> {
  month: Date;
  setMonth: (date: Date) => void;
}

const FetchCalendar = ({ month, setMonth, isEditMode, integrationIds, options, displayMode }: FetchCalendarProps) => {
  const input = {
    integrationIds,
    month: month.getMonth() + 1,
    year: month.getFullYear(),
    releaseType: options.releaseType,
    showUnmonitored: options.showUnmonitored,
  };
  const calendarQuery = clientApi.widget.calendar.findAllEvents.useQuery(input);
  const data = getUsableWidgetQueryData(calendarQuery);
  const { isPending } = calendarQuery;

  const events = useMemo(
    () =>
      data?.flatMap(({ events: integrationEvents, integration, error }) =>
        error
          ? []
          : integrationEvents.map(
              (event): CalendarEventWithSource => ({
                ...event,
                source: { integrationId: integration.id, integrationName: integration.name },
              }),
            ),
      ) ?? [],
    [data],
  );
  const failedIntegrations =
    data?.flatMap(({ integration, error }) =>
      error ? [{ integrationId: integration.id, integrationName: integration.name, error }] : [],
    ) ?? [];

  return (
    <CalendarBase
      isEditMode={isEditMode}
      events={events}
      failedIntegrations={failedIntegrations}
      isPending={isPending}
      queryError={calendarQuery.error}
      month={month}
      setMonth={setMonth}
      options={options}
      displayMode={displayMode}
    />
  );
};

interface CalendarBaseProps {
  isEditMode: boolean;
  events: CalendarEventWithSource[];
  failedIntegrations: { integrationId: string; integrationName: string; error: string }[];
  isPending: boolean;
  queryError: unknown;
  month: Date;
  setMonth: (date: Date) => void;
  options: WidgetComponentProps<"calendar">["options"];
  displayMode?: WidgetComponentProps<"calendar">["displayMode"];
}

const CalendarBase = ({
  isEditMode,
  events,
  failedIntegrations,
  isPending,
  queryError,
  month,
  setMonth,
  options,
  displayMode,
}: CalendarBaseProps) => {
  const t = useI18n();
  const locale = useCurrentIntlLocale();
  const { firstDayOfWeek } = useSettings();
  const board = useRequiredBoard();
  const mantineTheme = useMantineTheme();
  const actualItemRadius = mantineTheme.radius[board.itemRadius];
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
        failedIntegrations={failedIntegrations}
        isPending={isPending}
        queryError={queryError}
        queryErrorLabel={t("widget.calendar.name")}
        isEditMode={isEditMode}
        locale={locale}
        month={month}
        setMonth={setMonth}
      />
    );
  }

  return (
    <Stack ref={ref} h="100%" w="100%" gap="xs" style={{ overflow: "hidden" }}>
      {(failedIntegrations.length > 0 || Boolean(queryError)) && (
        <Group px="xs" justify="flex-end">
          <IntegrationErrorIndicator results={failedIntegrations} />
          <WidgetQueryErrorIndicator error={queryError} label={t("widget.calendar.name")} />
        </Group>
      )}
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
        static={isEditMode}
        className={classes.calendar}
        w="100%"
        h="100%"
        styles={{
          calendarHeaderControl: {
            pointerEvents: isEditMode ? "none" : undefined,
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
            <CalendarDay
              date={dayjs(tileDate).toDate()}
              events={eventsForDate}
              disabled={isEditMode || eventsForDate.length === 0}
              rootWidth={width}
              rootHeight={height}
            />
          );
        }}
      />
    </Stack>
  );
};

interface CalendarAgendaProps {
  events: CalendarEventWithSource[];
  failedIntegrations: CalendarBaseProps["failedIntegrations"];
  isPending: boolean;
  queryError: unknown;
  queryErrorLabel: string;
  isEditMode: boolean;
  locale: string;
  month: Date;
  setMonth: (date: Date) => void;
}

const CalendarAgenda = ({
  events,
  failedIntegrations,
  isPending,
  queryError,
  queryErrorLabel,
  isEditMode,
  locale,
  month,
  setMonth,
}: CalendarAgendaProps) => {
  const t = useScopedI18n("widget.calendar.advanced");
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
              <IconChevronLeft style={iconSizes.lg} aria-hidden />
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
              <IconChevronRight style={iconSizes.lg} aria-hidden />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Group gap={0}>
          <IntegrationErrorIndicator results={failedIntegrations} />
          <WidgetQueryErrorIndicator error={queryError} label={queryErrorLabel} />
        </Group>
      </Group>

      <Box style={{ flex: 1, minHeight: 0 }}>
        {isPending ? (
          <Center component="output" h="100%" aria-label={t("loading")}>
            <Loader size="sm" />
          </Center>
        ) : events.length > 0 ? (
          <CalendarEventList events={events} advanced groupByDate locale={locale} fillHeight />
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
