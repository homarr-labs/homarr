"use client";

import { useEffect, useState } from "react";
import { ActionIcon, Badge, Box, Button, Card, Flex, Image, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconClockPause, IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { integrationDefs } from "@homarr/definitions";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
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

  return (
    <Flex h="100%" direction="column" gap={0} p="2.5cqmin">
      {options.showToggleAllButtons && (
        <Flex gap="2.5cqmin">
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

      <Stack gap="2.5cqmin" flex={1} justify={options.showToggleAllButtons ? "flex-end" : "space-evenly"}>
        {data.map((integrationData) =>
          ControlsCard(integrationData.integrationId, integrationData.integrationKind, toggleDns, status, open, t),
        )}
      </Stack>

      <TimerModal opened={opened} close={close} integrationIds={integrationIds} disableDns={disableDns} />
    </Flex>
  );
}

const ControlsCard = (
  integrationId: string,
  integrationKind: string,
  toggleDns: (integrationId: string) => void,
  status: { integrationId: string; enabled: boolean }[],
  open: () => void,
  t: TranslationFunction,
) => {
  const integrationStatus = status.find((item) => item.integrationId === integrationId);
  const isEnabled = integrationStatus?.enabled ?? false;
  const integrationDef = integrationKind === "piHole" ? integrationDefs.piHole : integrationDefs.adGuardHome;

  return (
    <Card key={integrationId} withBorder p="2.5cqmin" radius="2.5cqmin">
      <Flex>
        <Box m="1.5cqmin" p="1.5cqmin">
          <Image src={integrationDef.iconUrl} width="50cqmin" height="50cqmin" fit="contain" />
        </Box>
        <Flex direction="column" m="1.5cqmin" p="1.5cqmin" gap="1cqmin">
          <Text>{integrationDef.name}</Text>
          <Flex direction="row" gap="2cqmin">
            <UnstyledButton onClick={() => toggleDns(integrationId)}>
              <Badge variant="dot" color={dnsLightStatus(isEnabled)}>
                {t(`widget.dnsHoleControls.controls.${isEnabled ? "enabled" : "disabled"}`)}
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
