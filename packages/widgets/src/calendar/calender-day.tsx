import { useState } from "react";
import { Container, Popover, Text, useMantineTheme } from "@mantine/core";

import type { CalendarEvent } from "@homarr/integrations/types";

import { CalendarEventList } from "./calendar-event-list";
import { useRequiredBoard } from "@homarr/boards/context";

interface CalendarDayProps {
  date: Date;
  events: CalendarEvent[];
  disabled: boolean;
}

export const CalendarDay = ({ date, events, disabled }: CalendarDayProps) => {
  const [opened, setOpened] = useState(false);
  const { primaryColor } = useMantineTheme();
  const board = useRequiredBoard();
  const mantineTheme = useMantineTheme();
  const actualItemRadius = mantineTheme.radius[board.itemRadius];

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
      onChange={setOpened}
      opened={opened}
      disabled={disabled}
    >
      <Popover.Target>
        <Container
          h="100%"
          w="100%"
          p={0}
          m={0}
          bd={`3px solid ${opened && !disabled ? primaryColor : "transparent"}`}
          pos={"relative"}

          style={{
            alignContent: "center",
            borderRadius: actualItemRadius,
            cursor: disabled ? "default" : "pointer",
          }}
          onClick={() => {
            if (disabled) return;

            setOpened((prev) => !prev);
          }}
        >
          <Text ta={"center"}>
            {date.getDate()}
          </Text>
          <NotificationIndicator events={events}/>
        </Container>
      </Popover.Target>
      <Popover.Dropdown>
        <CalendarEventList events={events}/>
      </Popover.Dropdown>
    </Popover>
  );
};

interface NotificationIndicatorProps {
  events: CalendarEvent[];
}

const NotificationIndicator = ({ events }: NotificationIndicatorProps) => {
  const notificationEvents = [...new Set(events.map((event) => event.links[0]?.notificationColor))].filter(String);
  return (
    <Container h="xs" w="75%" display="flex" pos={"absolute"} bottom={0} left={"12.5%"} p={0}
               style={{ flexDirection: "row", justifyContent: "center" }}>
      {notificationEvents.map((notificationEvent) => {
        return (
          <Container
            key={notificationEvent}
            bg={notificationEvent}
            h={4}
            p={0}
            style={{ flex: 1, borderRadius: "1000px" }}
          />
        );
      })}
    </Container>
  );
};
