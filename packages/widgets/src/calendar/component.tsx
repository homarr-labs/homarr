"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Box, useMantineTheme } from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { useElementSize } from "@mantine/hooks";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import type { CalendarEvent } from "@homarr/integrations/types";
import { useSettings } from "@homarr/settings";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetMobileLoading, WidgetMobileSummary } from "../common/mobile-summary";
import { hasWidgetDataWarning, throwOnInitialQueryError, WidgetDataState } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { CalendarDay } from "./calender-day";
import classes from "./component.module.css";

export default function CalendarWidget(props: WidgetComponentProps<"calendar">) {
  const [month, setMonth] = useState(new Date());

  if (props.integrationIds.length === 0) {
    return <CalendarBase {...props} events={[]} month={month} setMonth={setMonth} />;
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
    month: month.getMonth(),
    year: month.getFullYear(),
    releaseType: options.releaseType,
    showUnmonitored: options.showUnmonitored,
  };
  const { data, error, isPending } = clientApi.widget.calendar.findAllEvents.useQuery(input);
  const events = useMemo(() => data?.flatMap((item) => item.events) ?? [], [data]);

  if (isPending) return <WidgetMobileLoading />;
  throwOnInitialQueryError(error, data !== undefined);

  return (
    <CalendarBase
      isEditMode={isEditMode}
      events={events}
      month={month}
      setMonth={setMonth}
      options={options}
      displayMode={displayMode}
      isStale={hasWidgetDataWarning({
        error,
        expectedIntegrationCount: integrationIds.length,
        receivedIntegrationCount: data?.length,
      })}
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
  isStale?: boolean;
}

const CalendarBase = ({
  isEditMode,
  events,
  month,
  setMonth,
  options,
  displayMode,
  isStale = false,
}: CalendarBaseProps) => {
  const params = useParams();
  const locale = params.locale as string;
  const { firstDayOfWeek } = useSettings();
  const board = useRequiredBoard();
  const t = useScopedI18n("widget.calendar");
  const mantineTheme = useMantineTheme();
  const actualItemRadius = mantineTheme.radius[board.itemRadius];
  const { ref, width, height } = useElementSize();
  const isSmall = width < 256;

  const normalizedEvents = useMemo(() => splitEvents(events), [events]);

  if (displayMode === "mobileSummary") {
    const nextEvent = normalizedEvents
      .filter((event) => event.startDate.getTime() >= Date.now())
      .toSorted((eventA, eventB) => eventA.startDate.getTime() - eventB.startDate.getTime())[0];
    const link = nextEvent?.links[0];
    const summary = (
      <WidgetMobileSummary
        value={nextEvent?.title ?? normalizedEvents.length}
        label={
          nextEvent
            ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(nextEvent.startDate)
            : t("name")
        }
        isStale={isStale}
      />
    );

    if (!link) return summary;

    return (
      <Box
        component="a"
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        h="100%"
        display="block"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {summary}
      </Box>
    );
  }

  const calendar = (
    <Calendar
      defaultDate={new Date()}
      onPreviousMonth={(month) => setMonth(new Date(month))}
      onNextMonth={(month) => setMonth(new Date(month))}
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
      ref={ref}
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
        const eventsForDate = normalizedEvents
          .filter((event) => dayjs(event.startDate).isSame(tileDate, "day"))
          .filter(
            (event) => event.metadata?.type !== "radarr" || options.releaseType.includes(event.metadata.releaseType),
          )
          .toSorted((eventA, eventB) => eventA.startDate.getTime() - eventB.startDate.getTime());

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
  );
  return <WidgetDataState hasWarning={isStale}>{calendar}</WidgetDataState>;
};

/**
 * Splits multi-day events into multiple single-day events.
 * @param events The events to split.
 * @returns The split events.
 */
export const splitEvents = (events: CalendarEvent[]): CalendarEvent[] => {
  const splitEvents: CalendarEvent[] = [];
  for (const event of events) {
    if (!event.endDate) {
      splitEvents.push(event);
      continue;
    }

    if (dayjs(event.startDate).isSame(event.endDate, "day")) {
      splitEvents.push(event);
      continue;
    }

    if (dayjs(event.startDate).isAfter(event.endDate)) {
      // Invalid event, skip it
      continue;
    }

    // Event spans multiple days, split it
    let currentStart = dayjs(event.startDate);

    while (currentStart.isBefore(event.endDate)) {
      splitEvents.push({
        ...event,
        startDate: currentStart.toDate(),
        endDate: currentStart.endOf("day").isAfter(event.endDate) ? event.endDate : currentStart.endOf("day").toDate(),
      });

      currentStart = currentStart.add(1, "day").startOf("day");
    }
  }
  return splitEvents;
};
