"use client";

import { useEffect, useState } from "react";
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

const dnsLightStatus = (enabled: boolean): "green" | "red" => (enabled ? "green" : "red");

export default function DnsHoleControlsWidget({ options, integrationIds }: WidgetComponentProps<"dnsHoleControls">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationSelectedError();
  }
  const t = useI18n();
  const [status, setStatus] = useState<{ integrationId: string; enabled: boolean }[]>(
    integrationIds.map((id) => ({ integrationId: id, enabled: false })),
  );
  const [opened, { close, open }] = useDisclosure(false);

  const [data] = clientApi.widget.dnsHole.summary.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      retry: false,
    },
  );

  useEffect(() => {
    const newStatus = data.map((integrationData) => ({
      integrationId: integrationData.integrationId,
      enabled: integrationData.summary.status === "enabled",
    }));
    setStatus(newStatus);
  }, [data]);

  const { mutate: enableDns } = clientApi.widget.dnsHole.enable.useMutation({
    onSuccess: (_, variables) => {
      setStatus((prevStatus) =>
        prevStatus.map((item) => (item.integrationId === variables.integrationId ? { ...item, enabled: true } : item)),
      );
    },
  });
  const { mutate: disableDns } = clientApi.widget.dnsHole.disable.useMutation({
    onSuccess: (_, variables) => {
      setStatus((prevStatus) =>
        prevStatus.map((item) => (item.integrationId === variables.integrationId ? { ...item, enabled: false } : item)),
      );
    },
  });
  const toggleDns = (integrationId: string) => {
    const integrationStatus = status.find((item) => item.integrationId === integrationId);
    if (integrationStatus?.enabled) {
      disableDns({ integrationId, duration: 0 });
    } else {
      enableDns({ integrationId });
    }
  };

  const allEnabled = status.every((item) => item.enabled);
  const allDisabled = status.every((item) => !item.enabled);

  const ControlsCard = (integrationId: string, integrationKind: string) => {
    const integrationStatus = status.find((item) => item.integrationId === integrationId);
    const isEnabled = integrationStatus?.enabled ?? false;
    const integrationDef = integrationKind === "piHole" ? integrationDefs.piHole : integrationDefs.adGuardHome;

    return (
      <Card key={integrationId} withBorder={true} m="2.5cqmin" p="2.5cqmin" radius="md">
        <Flex>
          <Box m="1.5cqmin" p="1.5cqmin">
            <Image src={integrationDef.iconUrl} width={50} height={50} fit="contain" />
          </Box>
          <Flex direction="column" m="1.5cqmin" p="1.5cqmin" gap="1cqmin">
            <Badge variant="default">{integrationDef.name}</Badge>
            <Flex direction="row" gap="2cqmin">
              <UnstyledButton onClick={() => toggleDns(integrationId)}>
                <Badge variant="dot" color={dnsLightStatus(isEnabled)}>
                  {isEnabled
                    ? t("widget.dnsHoleControls.controls.enabled")
                    : t("widget.dnsHoleControls.controls.disabled")}
                </Badge>
              </UnstyledButton>
              <ActionIcon disabled={!isEnabled} size={20} radius="xl" top="2.67px" variant="default" onClick={open}>
                <IconClockPause size={20} color="red" />
              </ActionIcon>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    );
  };

  return (
    <Box h="100%" {...boxPropsByLayout(options.layout)}>
      {options.showToggleAllButtons && (
        <Flex gap="xs" m="2.5cqmin" p="2.5cqmin">
          <Tooltip label={t("widget.dnsHoleControls.controls.enableAll")}>
            <Button
              onClick={() => {
                integrationIds.forEach((integrationId) => enableDns({ integrationId }));
              }}
              disabled={allEnabled}
              variant="light"
              color="green"
              fullWidth
              h="2rem"
            >
              <IconPlayerPlay size={20} />
            </Button>
          </Tooltip>

          <Tooltip label={t("widget.dnsHoleControls.controls.setTimer")}>
            <Button onClick={open} disabled={allDisabled} variant="light" color="yellow" fullWidth h="2rem">
              <IconClockPause size={20} />
            </Button>
          </Tooltip>

          <Tooltip label={t("widget.dnsHoleControls.controls.disableAll")}>
            <Button
              onClick={() => {
                integrationIds.forEach((integrationId) => disableDns({ integrationId, duration: 0 }));
              }}
              disabled={allDisabled}
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

      {data.map((integrationData) => ControlsCard(integrationData.integrationId, integrationData.integrationKind))}

      <TimerModal opened={opened} close={close} integrationIds={integrationIds} disableDns={disableDns} />
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
