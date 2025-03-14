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

  return (
    <Calendar
      defaultDate={new Date()}
      onPreviousMonth={setMonth}
      onNextMonth={setMonth}
      highlightToday
      locale={locale}
      hideWeekdays={false}
      date={month}
      maxLevel="month"
      firstDayOfWeek={firstDayOfWeek}
      static={isEditMode}
      className={classes.calendar}
      w={"100%"}
      h={"100%"}
      ref={ref}
      styles={{
        calendarHeaderControl: {
          pointerEvents: isEditMode ? "none" : undefined,
          borderRadius: "md",
        },
        calendarHeaderLevel: {
          pointerEvents: "none",
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
            date={tileDate}
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
