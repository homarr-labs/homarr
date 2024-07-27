"use client";

import { useState } from "react";
import type { BoxProps } from "@mantine/core";
import { ActionIcon, Badge, Box, Button, Card, Flex, Group, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconClockPause, IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps, WidgetProps } from "../../definition";
import { NoIntegrationSelectedError } from "../../errors";
import TimerModal from "./TimerModal";

const dnsLightStatus = (currentStatus: string): "blue" | "green" | "red" => {
  if (currentStatus === "enabled") {
    return "green";
  }
  return "red";
};

export default function DnsHoleControlsWidget({ options, integrationIds }: WidgetComponentProps<"dnsHoleControls">) {
  const integrationId = integrationIds.at(0);

  if (!integrationId) {
    throw new NoIntegrationSelectedError();
  }

  const [data] = clientApi.widget.dnsHole.summary.useSuspenseQuery(
    {
      integrationId,
    },
    {
      refetchOnMount: false,
      retry: false,
    },
  );

  const t = useI18n();
  const [status, setStatus] = useState<string>(data.status);
  const [duration, setDuration] = useState<number>(0);
  const [opened, { close, open }] = useDisclosure(false);

  const { mutate: enableQueue } = clientApi.widget.dnsHole.enable.useMutation({
    onSuccess: () => {
      setStatus("enabled");
    },
  });
  const { mutate: disableQueue } = clientApi.widget.dnsHole.disable.useMutation({
    onSuccess: () => {
      setStatus("disabled");
    },
  });

  const toggleDns = () => {
    if (status === "enabled") {
      disableQueue({ duration, integrationId });
    } else {
      enableQueue({ integrationId });
    }
  };

  return (
    <Box h="100%" {...boxPropsByLayout(options.layout)}>
      {options.showToggleAllButtons && (
        <Flex gap="xs">
          <Tooltip label={t("widget.dnsHoleControls.controls.enableAll")}>
            <Button variant="light" color="green" fullWidth h="2rem">
              <IconPlayerPlay size={20} />
            </Button>
          </Tooltip>

          <Tooltip label={t("widget.dnsHoleControls.controls.setTimer")}>
            <Button variant="light" color="yellow" fullWidth h="2rem">
              <IconClockPause size={20} />
            </Button>
          </Tooltip>

          <Tooltip label={t("widget.dnsHoleControls.controls.disableAll")}>
            <Button variant="light" color="red" fullWidth h="2rem">
              <IconPlayerStop size={20} />
            </Button>
          </Tooltip>
        </Flex>
      )}

      <Card withBorder={true} key={1} p="xs" radius="md">
        <Group>
          <Box>
            {/* <Image src={} /> */}
            <Text>PiHole Icon</Text>
          </Box>
          <Stack>
            <Text>PiHole</Text>
            <Flex direction="row" gap="md">
              <UnstyledButton onClick={toggleDns}>
                <Badge variant="dot" color={dnsLightStatus(status)}>
                  {status === "enabled"
                    ? t("widget.dnsHoleControls.controls.enabled")
                    : t("widget.dnsHoleControls.controls.disabled")}
                </Badge>
              </UnstyledButton>
              <ActionIcon size={20} radius="xl" top="2.67px" variant="default" onClick={open}>
                <IconClockPause size={20} color="red" />
              </ActionIcon>
            </Flex>
          </Stack>
        </Group>
      </Card>
      <TimerModal opened={opened} close={close} integrationId={integrationId} disableQueue={disableQueue} />
    </Box>
  );
}

const boxPropsByLayout = (layout: WidgetProps<"dnsHoleControls">["options"]["layout"]): BoxProps => {
  if (layout === "grid") {
    return {
      display: "grid",
      style: {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
      },
    };
  }

  return {
    display: "flex",
    style: {
      flexDirection: layout,
    },
  };
};
