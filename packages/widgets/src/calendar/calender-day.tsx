import { useMemo } from "react";
import type { ReactNode } from "react";
import { Box, Container, HoverCard, Text } from "@mantine/core";

import type { CalendarEvent } from "@homarr/integrations/types";

import { CalendarEventList } from "./calendar-event-list";

interface CalendarDayProps {
  date: Date;
  events: CalendarEvent[];
  disabled: boolean;
  rootWidth: number;
  rootHeight: number;
}

const fallbackDayScale = { textSize: "xs" as const, indicatorSize: 3, indicatorMarginTop: 2 };
const dayScaleTiers = [
  { minAxisSize: 700, textSize: "lg" as const, indicatorSize: 6, indicatorMarginTop: 6 },
  { minAxisSize: 450, textSize: "md" as const, indicatorSize: 5, indicatorMarginTop: 4 },
  { minAxisSize: 250, textSize: "sm" as const, indicatorSize: 4, indicatorMarginTop: 3 },
  { minAxisSize: 0, ...fallbackDayScale },
];

const getDayScale = (minAxisSize: number) =>
  dayScaleTiers.find((tier) => minAxisSize >= tier.minAxisSize) ?? fallbackDayScale;

export const CalendarDay = ({ date, events, disabled, rootHeight, rootWidth }: CalendarDayProps) => {
  const minAxisSize = Math.min(rootWidth, rootHeight);
  const { textSize, indicatorSize, indicatorMarginTop } = useMemo(() => getDayScale(minAxisSize), [minAxisSize]);

  const cell = (
    <Container
      h="100%"
      w="100%"
      p={0}
      m={0}
      pos="relative"
      style={{
        alignItems: "center",
        borderRadius: "var(--mantine-radius-sm)",
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Text ta={"center"} size={textSize} lh={1}>
        {date.getDate()}
      </Text>
      <NotificationIndicator events={events} size={indicatorSize} marginTop={indicatorMarginTop} />
    </Container>
  );

  if (disabled) return cell;

  return <CalendarEventsHoverCard events={events}>{cell}</CalendarEventsHoverCard>;
};

interface CalendarEventsHoverCardProps {
  events: CalendarEvent[];
  children: ReactNode;
}

export const CalendarEventsHoverCard = ({ events, children }: CalendarEventsHoverCardProps) => (
  <HoverCard
    position="bottom"
    withArrow
    withinPortal
    radius="lg"
    shadow="sm"
    transitionProps={{ transition: "pop" }}
    openDelay={350}
    closeDelay={400}
  >
    <HoverCard.Target>{children}</HoverCard.Target>
    <HoverCard.Dropdown maw="calc(100vw - 24px)" w={512} ps={4} pe={4} pt={4} pb={0} style={{ overflow: "hidden" }}>
      <CalendarEventList events={events} />
    </HoverCard.Dropdown>
  </HoverCard>
);

interface NotificationIndicatorProps {
  events: CalendarEvent[];
  size: number;
  marginTop: number;
}

const NotificationIndicator = ({ events, size, marginTop }: NotificationIndicatorProps) => {
  const notificationEvents = [...new Set(events.map((event) => event.indicatorColor))].filter(
    (color): color is string => Boolean(color),
  );

  if (notificationEvents.length === 0) return null;

  return (
    <Box
      mt={marginTop}
      w="fit-content"
      maw="75%"
      p={0}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(notificationEvents.length, 3)}, ${size}px)`,
        gap: 2,
        justifyContent: "center",
      }}
      aria-hidden
    >
      {notificationEvents.map((notificationEvent) => {
        return (
          <Box key={notificationEvent} bg={notificationEvent} h={size} w={size} p={0} style={{ borderRadius: 999 }} />
        );
      })}
    </Box>
  );
};
