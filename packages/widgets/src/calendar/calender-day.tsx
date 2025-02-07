import { Container, Popover, useMantineTheme } from "@mantine/core";
import { useClickOutside, useDisclosure } from "@mantine/hooks";

import type { CalendarEvent } from "@homarr/integrations/types";

import { CalendarEventList } from "./calendar-event-list";

interface CalendarDayProps {
  date: Date;
  events: CalendarEvent[];
  disabled: boolean;
}

export const CalendarDay = ({ date, events, disabled }: CalendarDayProps) => {
  const [opened, { close, open }] = useDisclosure(false);
  const { primaryColor } = useMantineTheme();
  const popoverRef = useClickOutside(close);

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
      disabled={disabled}
    >
      <Popover.Target>
        <Container
          onClick={events.length > 0 && !opened ? open : close}
          ref={popoverRef}
          h="100%"
          w="100%"
          p={0}
          m={0}
          bd={`1cqmin solid ${opened && !disabled ? primaryColor : "transparent"}`}
          style={{
            alignContent: "center",
            borderRadius: "3.5cqmin",
            cursor: events.length === 0 || disabled ? "default" : "pointer",
          }}
        >
          <div
            style={{
              textAlign: "center",
              whiteSpace: "nowrap",
              fontSize: "5cqmin",
              lineHeight: "5cqmin",
              paddingTop: "1.25cqmin",
            }}
          >
            {date.getDate()}
          </div>
          <NotificationIndicator events={events} />
        </Container>
      </Popover.Target>
      <Popover.Dropdown>
        <CalendarEventList events={events} />
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
    <Container h="0.7cqmin" w="80%" display="flex" p={0} style={{ flexDirection: "row", justifyContent: "center" }}>
      {notificationEvents.map((notificationEvent) => {
        return (
          <Container
            key={notificationEvent}
            bg={notificationEvent}
            h="100%"
            mx="0.25cqmin"
            p={0}
            style={{ flex: 1, borderRadius: "1000px" }}
          />
        );
      })}
    </Container>
  );
};
