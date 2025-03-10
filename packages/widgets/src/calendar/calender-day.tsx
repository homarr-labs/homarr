import { useState } from "react";
import { Box, Container, Flex, Popover, Text, useMantineTheme } from "@mantine/core";

import { useRequiredBoard } from "@homarr/boards/context";
import type { CalendarEvent } from "@homarr/integrations/types";

import { CalendarEventList } from "./calendar-event-list";

interface CalendarDayProps {
  date: Date;
  events: CalendarEvent[];
  disabled: boolean;
  rootWidth: number;
  rootHeight: number;
}

export const CalendarDay = ({ date, events, disabled, rootHeight, rootWidth }: CalendarDayProps) => {
  const [opened, setOpened] = useState(false);
  const { primaryColor } = useMantineTheme();
  const board = useRequiredBoard();
  const mantineTheme = useMantineTheme();
  const actualItemRadius = mantineTheme.radius[board.itemRadius];

  const minAxisSize = Math.min(rootWidth, rootHeight);
  const shouldScaleDown = minAxisSize < 350;

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
          bd={`2px solid ${opened && !disabled ? primaryColor : "transparent"}`}
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
          <Text ta={"center"} size={shouldScaleDown ? "xs" : "md"} lh={1}>
            {date.getDate()}
          </Text>
          <NotificationIndicator events={events} rootHeight={rootHeight} />
        </Container>
      </Popover.Target>
      {/* Popover has some offset on the left side, padding is removed because of scrollarea paddings */}
      <Popover.Dropdown maw="calc(100vw - 10px)" pe={4} pb={0} style={{ overflow: "hidden" }}>
        <CalendarEventList events={events} />
      </Popover.Dropdown>
    </Popover>
  );
};

interface NotificationIndicatorProps {
  events: CalendarEvent[];
  rootHeight: number;
}

const NotificationIndicator = ({ events, rootHeight }: NotificationIndicatorProps) => {
  const isSmall = rootHeight < 256;
  const notificationEvents = [...new Set(events.map((event) => event.links[0]?.notificationColor))].filter(String);
  /* position bottom is lower when small to not be on top of number*/
  return (
    <Flex w="75%" pos={"absolute"} bottom={isSmall ? -2 : 4} left={"12.5%"} p={0} direction={"row"} justify={"center"}>
      {notificationEvents.map((notificationEvent) => {
        return <Box key={notificationEvent} bg={notificationEvent} h={2} p={0} style={{ flex: 1, borderRadius: 5 }} />;
      })}
    </Flex>
  );
};
