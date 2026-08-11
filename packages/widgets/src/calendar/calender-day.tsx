import { Box, Container, Flex, HoverCard, Text, useMantineTheme } from "@mantine/core";

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
  const board = useRequiredBoard();
  const mantineTheme = useMantineTheme();
  const actualItemRadius = mantineTheme.radius[board.itemRadius];

  const minAxisSize = Math.min(rootWidth, rootHeight);
  const shouldScaleDown = minAxisSize < 350;
  const isSmall = rootHeight < 256;

  const cell = (
    <Container
      h="100%"
      w="100%"
      p={0}
      pt={isSmall ? 0 : 10}
      pb={isSmall ? 0 : 10}
      m={0}
      pos="relative"
      style={{
        alignContent: "center",
        borderRadius: actualItemRadius,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <Text ta={"center"} size={shouldScaleDown ? "xs" : "md"} lh={1}>
        {date.getDate()}
      </Text>
      <NotificationIndicator events={events} isSmall={isSmall} />
    </Container>
  );

  if (disabled) return cell;

  return (
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
      <HoverCard.Target>{cell}</HoverCard.Target>
      <HoverCard.Dropdown maw="calc(100vw - 24px)" w={512} pe={4} pb={0} style={{ overflow: "hidden" }}>
        <CalendarEventList events={events} />
      </HoverCard.Dropdown>
    </HoverCard>
  );
};

interface NotificationIndicatorProps {
  events: CalendarEvent[];
  isSmall: boolean;
}

const NotificationIndicator = ({ events, isSmall }: NotificationIndicatorProps) => {
  const notificationEvents = [...new Set(events.map((event) => event.indicatorColor))].filter(String);
  return (
    <Flex
      w="75%"
      align={"center"}
      pos={"absolute"}
      gap={3}
      bottom={isSmall ? 4 : 10}
      left={"12.5%"}
      p={0}
      direction={"row"}
      justify={"center"}
    >
      {notificationEvents.map((notificationEvent) => {
        return <Box key={notificationEvent} bg={notificationEvent} h={4} w={4} p={0} style={{ borderRadius: 999 }} />;
      })}
    </Flex>
  );
};
