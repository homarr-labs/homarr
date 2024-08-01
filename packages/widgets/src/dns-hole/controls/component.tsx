"use client";

import { useState } from "react";
import type { BoxProps } from "@mantine/core";
import { ActionIcon, Badge, Box, Button, Card, Flex, Image, Tooltip, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconClockPause, IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { integrationDefs } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps, WidgetProps } from "../../definition";
import { NoIntegrationSelectedError } from "../../errors";
import TimerModal from "./TimerModal";

const dnsLightStatus = (currentStatus: string): "green" | "red" => {
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

  const PiHoleIntegrationDef = integrationDefs.piHole;
  const AdGuardHomeIntegrationDef = integrationDefs.adGuardHome;
  const [data] = clientApi.widget.dnsHole.summary.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      retry: false,
    },
  );

  const t = useI18n();
  const [status, setStatus] = useState<string>(data[0]?.summary.status);
  const [opened, { close, open }] = useDisclosure(false);

  const { mutate: enableDnsControl } = clientApi.widget.dnsHole.enable.useMutation({
    onSuccess: () => {
      setStatus("enabled");
    },
  });
  const { mutate: disableDnsControl } = clientApi.widget.dnsHole.disable.useMutation({
    onSuccess: () => {
      setStatus("disabled");
    },
  });

  const toggleDns = () => {
    if (status === "enabled") {
      disableDnsControl({ integrationId, duration: 0 });
    } else {
      enableDnsControl({ integrationId });
    }
  };

  return (
    <Box h="100%" {...boxPropsByLayout(options.layout)}>
      {options.showToggleAllButtons && (
        <Flex gap="xs" m="2.5cqmin" p="2.5cqmin">
          <Tooltip label={t("widget.dnsHoleControls.controls.enableAll")}>
            <Button
              onClick={() => {
                enableDnsControl({ integrationId });
              }}
              disabled={status === "enabled"}
              variant="light"
              color="green"
              fullWidth
              h="2rem"
            >
              <IconPlayerPlay size={20} />
            </Button>
          </Tooltip>

          <Tooltip label={t("widget.dnsHoleControls.controls.setTimer")}>
            <Button onClick={open} disabled={status === "disabled"} variant="light" color="yellow" fullWidth h="2rem">
              <IconClockPause size={20} />
            </Button>
          </Tooltip>

          <Tooltip label={t("widget.dnsHoleControls.controls.disableAll")}>
            <Button
              onClick={() => {
                disableDnsControl({ integrationId });
              }}
              disabled={status === "disabled"}
              variant="light"
              color="red"
              fullWidth
              h="2rem"
            >
              <IconPlayerStop size={20} />
            </Button>
          </Tooltip>
        </Flex>
      )}

      <Card withBorder={true} m="2.5cqmin" p="2.5cqmin" radius="md">
        <Flex>
          <Box m="1.5cqmin" p="1.5cqmin">
            <Image src={PiHoleIntegrationDef.iconUrl} width={50} height={50} fit="contain" />
          </Box>
          <Flex direction="column" m="1.5cqmin" p="1.5cqmin" gap="1cqmin">
            <Badge variant="default">{PiHoleIntegrationDef.name}</Badge>
            <Flex direction="row" gap="2cqmin">
              <UnstyledButton onClick={toggleDns}>
                <Badge variant="dot" color={dnsLightStatus(status)}>
                  {status === "enabled"
                    ? t("widget.dnsHoleControls.controls.enabled")
                    : t("widget.dnsHoleControls.controls.disabled")}
                </Badge>
              </UnstyledButton>
              <ActionIcon
                disabled={status === "disabled"}
                size={20}
                radius="xl"
                top="2.67px"
                variant="default"
                onClick={open}
              >
                <IconClockPause size={20} color="red" />
              </ActionIcon>
            </Flex>
          </Flex>
        </Flex>
      </Card>
      <TimerModal opened={opened} close={close} integrationId={integrationId} disableDnsControl={disableDnsControl} />
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
