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
  const shouldShowIndicators = rootHeight >= 256;
  const indicatorSize = shouldScaleDown ? 3 : 4;

  const cell = (
    <Container
      h="100%"
      w="100%"
      p={0}
      m={0}
      pos="relative"
      style={{
        alignItems: "center",
        borderRadius: actualItemRadius,
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Text ta={"center"} size={shouldScaleDown ? "xs" : "md"} lh={1}>
        {date.getDate()}
      </Text>
      <NotificationIndicator events={events} size={indicatorSize} visible={shouldShowIndicators} />
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
  size: number;
  visible: boolean;
}

const NotificationIndicator = ({ events, size, visible }: NotificationIndicatorProps) => {
  const notificationEvents = [...new Set(events.map((event) => event.indicatorColor))].filter(
    (color): color is string => Boolean(color),
  );

  if (!visible) return null;

  return (
    <Flex
      mt={3}
      w="fit-content"
      maw="75%"
      h={size}
      align={"center"}
      gap={2}
      p={0}
      direction={"row"}
      justify={"center"}
      aria-hidden
    >
      {notificationEvents.map((notificationEvent) => {
        return (
          <Box
            key={notificationEvent}
            bg={notificationEvent}
            h={size}
            w={size * 2}
            p={0}
            style={{ borderRadius: 999 }}
          />
        );
      })}
    </Flex>
  );
};
