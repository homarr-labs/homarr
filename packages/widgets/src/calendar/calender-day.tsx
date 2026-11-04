import { Box } from "@mantine/core";

import type { CalendarEvent } from "@homarr/integrations/types";

import { CalendarEventsHoverCard } from "./calendar-event-list";
import classes from "./component.module.css";

interface CalendarDayProps {
  date: Date;
  events: CalendarEvent[];
  disabled: boolean;
}

export const CalendarDay = ({ date, events, disabled }: CalendarDayProps) => (
  <CalendarEventsHoverCard events={events} disabled={disabled}>
    <Box className={classes.compactDay} data-disabled={disabled || undefined}>
      <span className={classes.compactDayNumber}>{date.getDate()}</span>
      <NotificationIndicator events={events} />
    </Box>
  </CalendarEventsHoverCard>
);

const NotificationIndicator = ({ events }: { events: CalendarEvent[] }) => {
  const colors = [...new Set(events.map((event) => event.indicatorColor))].filter((color): color is string =>
    Boolean(color),
  );

  if (colors.length === 0) return null;

  return (
    <Box className={classes.indicators} aria-hidden>
      {colors.map((color) => (
        <Box key={color} bg={color} className={classes.indicator} />
      ))}
    </Box>
  );
};
