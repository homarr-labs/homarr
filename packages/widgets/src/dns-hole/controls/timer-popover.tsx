import type { ReactNode } from "react";
import { useRef, useState } from "react";
import type { NumberInputHandlers } from "@mantine/core";
import { ActionIcon, Button, Flex, Group, NumberInput, Popover, rem, Stack, Text } from "@mantine/core";
import { IconClockPause } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";

import { useI18n } from "@homarr/translation/client";

interface TimerPopoverProps {
  target: (onClick: () => void) => ReactNode;
  selectedIntegrationIds: string[];
  disableDns: (data: { duration: number; integrationId: string }) => void;
}

const TimerPopover = ({ target, selectedIntegrationIds, disableDns }: TimerPopoverProps) => {
  const t = useI18n("widget.dnsHoleControls");
  const tCommon = useI18n("common");
  const [opened, { close, open }] = useDisclosure(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const hoursHandlers = useRef<NumberInputHandlers>(null);
  const minutesHandlers = useRef<NumberInputHandlers>(null);

  const handleSetTimer = () => {
    const duration = hours * 3600 + minutes * 60;
    selectedIntegrationIds.forEach((integrationId) => {
      disableDns({ duration, integrationId });
    });
    setHours(0);
    setMinutes(0);
    close();
  };

  const reset = () => {
    close();
    setHours(0);
    setMinutes(0);
  };

  const handleToggle = () => {
    if (opened) {
      reset();
      return;
    }
    open();
  };

  return (
    <Popover
      opened={opened}
      onChange={(nextOpened) => {
        if (nextOpened) open();
        if (!nextOpened) reset();
      }}
      position="bottom"
      shadow="sm"
    >
      <Popover.Target>{target(handleToggle)}</Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm" maw={280}>
          <Text fw={500}>{t("controls.setTimer")}</Text>
          <Flex direction="column" align="center" justify="center">
            <Stack align="flex-end">
              <Group>
                <Text>{tCommon("information.hours")}</Text>
                <ActionIcon
                  size={35}
                  variant="default"
                  onClick={() => hoursHandlers.current?.decrement()}
                  aria-label={`− ${tCommon("information.hours")}`}
                >
                  –
                </ActionIcon>
                <NumberInput
                  hideControls
                  value={hours}
                  onChange={(val) => setHours(Number(val))}
                  handlersRef={hoursHandlers}
                  aria-label={tCommon("information.hours")}
                  max={999}
                  min={0}
                  step={1}
                  styles={{ input: { width: rem(54), textAlign: "center" } }}
                />
                <ActionIcon
                  size={35}
                  variant="default"
                  onClick={() => hoursHandlers.current?.increment()}
                  aria-label={`+ ${tCommon("information.hours")}`}
                >
                  +
                </ActionIcon>
              </Group>
              <Group>
                <Text>{tCommon("information.minutes")}</Text>
                <ActionIcon
                  size={35}
                  variant="default"
                  onClick={() => minutesHandlers.current?.decrement()}
                  aria-label={`− ${tCommon("information.minutes")}`}
                >
                  –
                </ActionIcon>
                <NumberInput
                  hideControls
                  value={minutes}
                  onChange={(val) => setMinutes(Number(val))}
                  handlersRef={minutesHandlers}
                  aria-label={tCommon("information.minutes")}
                  max={59}
                  min={0}
                  step={1}
                  styles={{ input: { width: rem(54), textAlign: "center" } }}
                />
                <ActionIcon
                  size={35}
                  variant="default"
                  onClick={() => minutesHandlers.current?.increment()}
                  aria-label={`+ ${tCommon("information.minutes")}`}
                >
                  +
                </ActionIcon>
              </Group>
            </Stack>
            <Text ta="center" c="dimmed" my={5}>
              {t("controls.unlimited")}
            </Text>
            <Button
              variant="light"
              color="red"
              leftSection={<IconClockPause size="var(--mantine-font-size-xl)" />}
              h="2rem"
              w="12rem"
              onClick={handleSetTimer}
            >
              {t("controls.set")}
            </Button>
          </Flex>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

export default TimerPopover;
