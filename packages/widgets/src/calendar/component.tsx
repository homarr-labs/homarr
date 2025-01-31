"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Calendar } from "@mantine/dates";
import dayjs from "dayjs";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
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
      w="100%"
      h="100%"
      static={isEditMode}
      className={classes.calendar}
      styles={{
        calendarHeaderControl: {
          pointerEvents: isEditMode ? "none" : undefined,
          height: "12cqmin",
          width: "12cqmin",
          borderRadius: "3.5cqmin",
        },
        calendarHeaderLevel: {
          height: "12cqmin",
          fontSize: "6cqmin",
          pointerEvents: "none",
        },
        levelsGroup: {
          height: "100%",
          padding: "2.5cqmin",
        },
        calendarHeader: {
          maxWidth: "unset",
          marginBottom: 0,
        },
        day: {
          width: "12cqmin",
          height: "12cqmin",
          borderRadius: "3.5cqmin",
        },
        monthCell: {
          textAlign: "center",
        },
        month: {
          height: "100%",
        },
        weekday: {
          fontSize: "5.5cqmin",
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
        return <CalendarDay date={tileDate} events={eventsForDate} disabled={isEditMode} />;
      }}
    />
  );
};
