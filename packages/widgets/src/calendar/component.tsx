"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Box, Stack, Text, useMantineTheme } from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { useElementSize } from "@mantine/hooks";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import type { CalendarEvent } from "@homarr/integrations/types";
import { useSettings } from "@homarr/settings";

import type { WidgetComponentProps } from "../definition";
import { setWidgetRuntimeQueries } from "../definition";
import { CalendarDay } from "./calender-day";
import { getCalendarAgendaEvents, groupEventsByDate, splitEvents, toCalendarDateKey } from "./calendar-events";
import { CalendarEventList } from "./calendar-event-list";
import classes from "./component.module.css";

export default function CalendarWidget(props: WidgetComponentProps<"calendar">) {
  const [month, setMonth] = useState(() => new Date());

  if (props.integrationIds.length === 0) {
    setWidgetRuntimeQueries(props.widgetStateRef, []);
    return <CalendarBase {...props} events={[]} month={month} setMonth={setMonth} />;
  }

  return <FetchCalendar month={month} setMonth={setMonth} {...props} />;
}

interface FetchCalendarProps extends WidgetComponentProps<"calendar"> {
  month: Date;
  setMonth: (date: Date) => void;
}

const FetchCalendar = ({
  month,
  setMonth,
  isEditMode,
  integrationIds,
  options,
  displayMode,
  widgetStateRef,
}: FetchCalendarProps) => {
  const input = {
    integrationIds,
    month: month.getMonth(),
    year: month.getFullYear(),
    releaseType: options.releaseType,
    showUnmonitored: options.showUnmonitored,
  };
  setWidgetRuntimeQueries(widgetStateRef, [{ path: ["widget", "calendar", "findAllEvents"], input }]);
  const { data } = clientApi.widget.calendar.findAllEvents.useQuery(input);

  const events = useMemo(() => data?.flatMap((item) => item.events) ?? [], [data]);

  return (
    <CalendarBase
      isEditMode={isEditMode}
      events={events}
      month={month}
      setMonth={setMonth}
      options={options}
      displayMode={displayMode}
    />
  );
};

interface CalendarBaseProps {
  isEditMode: boolean;
  events: CalendarEvent[];
  month: Date;
  setMonth: (date: Date) => void;
  options: WidgetComponentProps<"calendar">["options"];
  displayMode?: WidgetComponentProps<"calendar">["displayMode"];
}

const CalendarBase = ({ isEditMode, events, month, setMonth, options, displayMode }: CalendarBaseProps) => {
  const params = useParams();
  const locale = params.locale as string;
  const { firstDayOfWeek } = useSettings();
  const board = useRequiredBoard();
  const mantineTheme = useMantineTheme();
  const actualItemRadius = mantineTheme.radius[board.itemRadius];
  const { ref, width, height } = useElementSize();
  const isSmall = width < 256;
  const calendarHeight = displayMode === "advanced" ? height * 0.62 : height;

  const normalizedEvents = useMemo(() => splitEvents(events), [events]);
  const visibleEvents = useMemo(
    () =>
      normalizedEvents.filter(
        (event) => event.metadata?.type !== "radarr" || options.releaseType.includes(event.metadata.releaseType),
      ),
    [normalizedEvents, options.releaseType],
  );
  const eventsByDate = useMemo(() => groupEventsByDate(visibleEvents), [visibleEvents]);
  const agendaEvents = useMemo(
    () => getCalendarAgendaEvents(events, month, options.releaseType),
    [events, month, options.releaseType],
  );

  return (
    <Stack ref={ref} h="100%" w="100%" gap="xs" style={{ overflow: "hidden" }}>
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
        h={displayMode === "advanced" ? "62%" : "100%"}
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
              rootHeight={calendarHeight}
            />
          );
        }}
      />
      {displayMode === "advanced" && (
        <Box px="md" pb="sm" style={{ flex: 1, minHeight: 0 }}>
          <Text size="sm" fw={600} mb={4}>
            {new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month)} · {agendaEvents.length}
          </Text>
          <CalendarEventList events={agendaEvents} groupByDate locale={locale} />
        </Box>
      )}
    </Stack>
  );
};
