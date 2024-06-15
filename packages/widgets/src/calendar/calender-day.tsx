import type { ReactNode } from "react";
import type { IndicatorProps } from "@mantine/core";
import { Container, Indicator, Popover, useMantineTheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import type { CalendarEvent } from "@homarr/integrations/types";
import { CalendarEventList } from "./calendar-event-list";

interface CalendarDayProps {
  date: Date;
  events: CalendarEvent[];
}

export const CalendarDay = ({ date, events }: CalendarDayProps) => {
  const [opened, { close, open }] = useDisclosure(false);
  const { radius, primaryColor } = useMantineTheme();

  return (
    <Popover
      position="bottom"
      withArrow
      withinPortal
      radius="lg"
      shadow="sm"
      transitionProps={{
        transition: "pop",
      }}
      onClose={close}
      opened={opened}
    >
      <Popover.Target>
        <Container
          onClick={events.length > 0 && !opened ? open : close}
          h="100%"
          w="100%"
          style={{
            padding: "18% !important",
            borderRadius: radius.md,
            borderStyle: "solid",
            borderWidth: "0.2rem",
            borderColor: opened ? primaryColor : "transparent",
          }}
        >
          {events.length > 0 ? (
            <DayIndicator size={16} color="red" position="bottom-start" events={events}>
              <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>{date.getDate()}</div>
            </DayIndicator>
          ) : (
            <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>{date.getDate()}</div>
          )}
        </Container>
      </Popover.Target>
      <Popover.Dropdown>
        <CalendarEventList events={events} />
      </Popover.Dropdown>
    </Popover>
  );
};

interface DayIndicatorProps {
  size: number;
  color: string;
  events: CalendarEvent[];
  children: ReactNode;
  position: IndicatorProps["position"];
}

const DayIndicator = ({ size, color, events, children, position }: DayIndicatorProps) => {
  if (events.length === 0) return children;

  return (
    <Indicator size={size} withBorder color={color} position={position} zIndex={0}>
      {children}
    </Indicator>
  );
};
