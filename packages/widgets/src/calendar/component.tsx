"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMantineTheme } from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { useElementSize } from "@mantine/hooks";
import dayjs from "dayjs";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import type { CalendarEvent } from "@homarr/integrations/types";
import { useSettings } from "@homarr/settings";

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

const FetchCalendar = ({ month, setMonth, isEditMode, integrationIds, options }: FetchCalendarProps) => {
  const [events] = clientApi.widget.calendar.findAllEvents.useSuspenseQuery(
    {
      integrationIds,
      month: month.getMonth(),
      year: month.getFullYear(),
      releaseType: options.releaseType,
      showUnmonitored: options.showUnmonitored,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  return <CalendarBase isEditMode={isEditMode} events={events} month={month} setMonth={setMonth} options={options} />;
};

interface CalendarBaseProps {
  isEditMode: boolean;
  events: RouterOutputs["widget"]["calendar"]["findAllEvents"];
  month: Date;
  setMonth: (date: Date) => void;
  options: WidgetComponentProps<"calendar">["options"];
}

const CalendarBase = ({ isEditMode, events, month, setMonth, options }: CalendarBaseProps) => {
  const params = useParams();
  const locale = params.locale as string;
  const { firstDayOfWeek } = useSettings();
  const board = useRequiredBoard();
  const mantineTheme = useMantineTheme();
  const actualItemRadius = mantineTheme.radius[board.itemRadius];
  const { ref, width, height } = useElementSize();
  const isSmall = width < 256;

  return (
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
        },
        day: {
          borderRadius: actualItemRadius,
          width: "100%",
          height: "100%",
          position: "relative",
        },
        month: {
          height: "100%",
        },
        weekday: {
          padding: 0,
        },
      }}
      renderDay={(tileDate) => {
        const eventsForDate = events
          .map((event) => ({
            ...event,
            date: (event.dates?.filter(({ type }) => options.releaseType.includes(type)) ?? [event]).find(({ date }) =>
              dayjs(date).isSame(tileDate, "day"),
            )?.date,
          }))
          .filter((event): event is CalendarEvent => Boolean(event.date));

        return (
          <CalendarDay
            // new Date() does not work here, because for timezones like UTC-7 it will
            // show one day earlier (probably due to the time being set to 00:00)
            // see https://github.com/homarr-labs/homarr/pull/3120
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
};
