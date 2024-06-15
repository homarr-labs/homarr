"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Calendar } from "@mantine/dates";
import dayjs from "dayjs";

import type { WidgetComponentProps } from "../definition";
import { CalendarDay } from "./calender-day";
import classes from "./component.module.css";

export default function CalendarWidget({ serverData }: WidgetComponentProps<"calendar">) {
  const [month, setMonth] = useState(new Date());
  const params = useParams();
  const locale = params.locale as string;

  return (
    <Calendar
      defaultDate={new Date()}
      onPreviousMonth={setMonth}
      onNextMonth={setMonth}
      locale={locale}
      hideWeekdays={false}
      date={month}
      maxLevel="month"
      w="100%"
      h="100%"
      className={classes.calendar}
      styles={{
        levelsGroup: {
          height: "100%",
        },
        calendarHeader: {
          maxWidth: "unset",
        },
        day: {
          width: "100%",
        },
      }}
      renderDay={(date) => {
        const eventsForDate = (serverData?.initialData ?? []).filter((event) => dayjs(event.date).isSame(date, "day"));
        return <CalendarDay date={date} events={eventsForDate} />;
      }}
    />
  );
}
