"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Calendar } from "@mantine/dates";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { CalendarDay } from "./calender-day";
import classes from "./component.module.css";

export default function CalendarWidget({ isEditMode, integrationIds, itemId }: WidgetComponentProps<"calendar">) {
  const [events] = clientApi.widget.calendar.findAllEvents.useSuspenseQuery(
    {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      itemId: itemId!,
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const [month, setMonth] = useState(new Date());
  const params = useParams();
  const locale = params.locale as string;
  const [firstDayOfWeek] = clientApi.user.getFirstDayOfWeekForUserOrDefault.useSuspenseQuery();

  return (
    <Calendar
      defaultDate={new Date()}
      onPreviousMonth={setMonth}
      onNextMonth={setMonth}
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
      renderDay={(date) => {
        const eventsForDate = (serverData?.initialData ?? []).filter((event) => dayjs(event.date).isSame(date, "day"));
        return <CalendarDay date={date} events={eventsForDate} disabled={isEditMode} />;
      }}
    />
  );
}
