import { useMantineTheme } from "@mantine/core";

import { useRequiredBoard } from "@homarr/boards/context";

import { CalendarEventList } from "./calendar-event-list";
import { CalendarDayView } from "./native-view-day";
import type { CalendarDayViewProps } from "./native-view-day";

export function CalendarDay(props: Omit<CalendarDayViewProps, "actualItemRadius" | "eventList">) {
  const board = useRequiredBoard();
  const theme = useMantineTheme();
  return (
    <CalendarDayView
      {...props}
      actualItemRadius={theme.radius[board.itemRadius]}
      eventList={<CalendarEventList events={props.events} />}
    />
  );
}
