"use client";

import "../../widgets-common.css";

import { useState } from "react";
import { ActionIcon, Badge, Button, Card, Flex, ScrollArea, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCircleFilled, IconClockPause, IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";
import combineClasses from "clsx";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useIntegrationConnected } from "@homarr/common";
import { integrationDefs } from "@homarr/definitions";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import type { widgetKind } from ".";
import type { WidgetComponentProps } from "../../definition";
import classes from "./component.module.css";
import TimerModal from "./TimerModal";

const dnsLightStatus = (enabled: boolean | undefined) =>
  `var(--mantine-color-${typeof enabled === "undefined" ? "blue" : enabled ? "green" : "red"}-6`;

export default function DnsHoleControlsWidget({
  options,
  integrationIds,
  isEditMode,
}: WidgetComponentProps<typeof widgetKind>) {
  const board = useRequiredBoard();
  // DnsHole integrations with interaction permissions
  const integrationsWithInteractions = useIntegrationsWithInteractAccess()
    .map(({ id }) => id)
    .filter((id) => integrationIds.includes(id));

  const [summaries] = clientApi.widget.dnsHole.summary.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const utils = clientApi.useUtils();
  // Subscribe to summary updates
  clientApi.widget.dnsHole.subscribeToSummary.useSubscription(
    {
      integrationIds,
    },
    {
      onData: (data) => {
        utils.widget.dnsHole.summary.setData(
          {
            integrationIds,
          },
          (prevData) => {
            if (!prevData) return undefined;

            const newData = prevData.map((summary) =>
              summary.integration.id === data.integration.id
                ? {
                    integration: {
                      ...summary.integration,
                      updatedAt: new Date(),
                    },
                    summary: data.summary,
                  }
                : summary,
            );

            return newData;
          },
        );
      },
    },
  );

  // Mutations for dnsHole state, set to undefined on click, and change again on settle
  const { mutate: enableDns } = clientApi.widget.dnsHole.enable.useMutation({
    onSettled: (_, error, { integrationId }) => {
      utils.widget.dnsHole.summary.setData(
        {
          integrationIds,
        },
        (prevData) => {
          if (!prevData) return [];

          return prevData.map((item) =>
            item.integration.id === integrationId
              ? {
                  ...item,
                  summary: {
                    ...item.summary,
                    status: error ? "disabled" : "enabled",
                  },
                }
              : item,
          );
        },
      );
    },
  });
  const { mutate: disableDns } = clientApi.widget.dnsHole.disable.useMutation({
    onSettled: (_, error, { integrationId }) => {
      utils.widget.dnsHole.summary.setData(
        {
          integrationIds,
        },
        (prevData) => {
          if (!prevData) return [];

          return prevData.map((item) =>
            item.integration.id === integrationId
              ? {
                  ...item,
                  summary: {
                    ...item.summary,
                    status: error ? "enabled" : "disabled",
                  },
                }
              : item,
          );
        },
      );
    },
  });
  const toggleDns = (integrationId: string) => {
    const integrationStatus = summaries.find(({ integration }) => integration.id === integrationId);
    if (!integrationStatus?.summary.status) return;
    utils.widget.dnsHole.summary.setData(
      {
        integrationIds,
      },
      (prevData) => {
        if (!prevData) return [];

        return prevData.map((item) =>
          item.integration.id === integrationId
            ? {
                ...item,
                summary: {
                  ...item.summary,
                  status: undefined,
                },
              }
            : item,
        );
      },
    );
    if (integrationStatus.summary.status === "enabled") {
      disableDns({ integrationId, duration: 0 });
    } else {
      enableDns({ integrationId });
    }
  };

  // make lists of enabled and disabled interactable integrations (with permissions, not disconnected and not processing)
  const integrationsSummaries = summaries.reduce(
    (acc, { summary, integration: { id } }) =>
      integrationsWithInteractions.includes(id) && summary.status != null ? (acc[summary.status].push(id), acc) : acc,
    { enabled: [] as string[], disabled: [] as string[] },
  );

  const t = useI18n();

  // Timer modal setup
  const [selectedIntegrationIds, setSelectedIntegrationIds] = useState<string[]>([]);
  const [opened, { close, open }] = useDisclosure(false);

  const controlAllButtonsVisible = options.showToggleAllButtons && integrationsWithInteractions.length > 0;

  return (
    <Flex
      className="dns-hole-controls-stack"
      h="100%"
      direction="column"
      p="sm"
      gap="sm"
      style={{ pointerEvents: isEditMode ? "none" : undefined }}
    >
      {controlAllButtonsVisible && (
        <Flex className="dns-hole-controls-buttons" gap="sm">
          <Tooltip label={t("widget.dnsHoleControls.controls.enableAll")}>
            <Button
              className="dns-hole-controls-enable-all-button"
              onClick={() => integrationsSummaries.disabled.forEach((integrationId) => toggleDns(integrationId))}
              disabled={integrationsSummaries.disabled.length === 0}
              variant="light"
              color="green"
              h="fit-content"
              p="xs"
              bd={0}
              radius={board.itemRadius}
              flex={1}
            >
              <IconPlayerPlay className="dns-hole-controls-enable-all-icon" size={24} />
            </Button>
          </Tooltip>

          <Tooltip label={t("widget.dnsHoleControls.controls.setTimer")}>
            <Button
              className="dns-hole-controls-timer-all-button"
              onClick={() => {
                setSelectedIntegrationIds(integrationsSummaries.enabled);
                open();
              }}
              disabled={integrationsSummaries.enabled.length === 0}
              variant="light"
              color="yellow"
              h="fit-content"
              p="xs"
              bd={0}
              radius={board.itemRadius}
              flex={1}
            >
              <IconClockPause className="dns-hole-controls-timer-all-icon" size={24} />
            </Button>
          </Tooltip>

          <Tooltip label={t("widget.dnsHoleControls.controls.disableAll")}>
            <Button
              className="dns-hole-controls-disable-all-button"
              onClick={() => integrationsSummaries.enabled.forEach((integrationId) => toggleDns(integrationId))}
              disabled={integrationsSummaries.enabled.length === 0}
              variant="light"
              color="red"
              h="fit-content"
              p="xs"
              bd={0}
              radius={board.itemRadius}
              flex={1}
            >
              <IconPlayerStop className="dns-hole-controls-disable-all-icon" size={24} />
            </Button>
          </Tooltip>
        </Flex>
      )}

      <ScrollArea className="dns-hole-controls-integration-list-scroll-area flexed-scroll-area">
        <Stack
          className="dns-hole-controls-integration-list"
          gap="sm"
          flex={1}
          justify={controlAllButtonsVisible ? "flex-end" : "space-evenly"}
        >
          {summaries.map((summary) => (
            <ControlsCard
              key={summary.integration.id}
              integrationsWithInteractions={integrationsWithInteractions}
              toggleDns={toggleDns}
              data={summary}
              setSelectedIntegrationIds={setSelectedIntegrationIds}
              open={open}
              t={t}
              hasIconColor={board.iconColor !== null}
            />
          ))}
        </Stack>
      </ScrollArea>

      <TimerModal
        opened={opened}
        close={close}
        selectedIntegrationIds={selectedIntegrationIds}
        disableDns={disableDns}
      />
    </Flex>
  );
}

interface ControlsCardProps {
  integrationsWithInteractions: string[];
  toggleDns: (integrationId: string) => void;
  data: RouterOutputs["widget"]["dnsHole"]["summary"][number];
  setSelectedIntegrationIds: (integrationId: string[]) => void;
  open: () => void;
  t: TranslationFunction;
  hasIconColor: boolean;
}

const ControlsCard: React.FC<ControlsCardProps> = ({
  integrationsWithInteractions,
  toggleDns,
  data,
  setSelectedIntegrationIds,
  open,
  t,
  hasIconColor,
}) => {
  const isConnected = useIntegrationConnected(data.integration.updatedAt, { timeout: 30000 });
  const isEnabled = data.summary.status ? data.summary.status === "enabled" : undefined;
  const isInteractPermitted = integrationsWithInteractions.includes(data.integration.id);
  // Use all factors to infer the state of the action buttons
  const controlEnabled = isInteractPermitted && isEnabled !== undefined && isConnected;
  const board = useRequiredBoard();

  const iconUrl = integrationDefs[data.integration.kind].iconUrl;

  return (
    <Card
      className={combineClasses(
        "dns-hole-controls-integration-item-outer-shell",
        `dns-hole-controls-integration-item-${data.integration.id}`,
        `dns-hole-controls-integration-item-${data.integration.name}`,
        classes.card,
      )}
      key={data.integration.id}
      p="sm"
      py={8}
      radius={board.itemRadius}
    >
      <Flex className="dns-hole-controls-item-container" gap="md" align="center" direction="row">
        <MaskedOrNormalImage
          imageUrl={iconUrl}
          hasColor={hasIconColor}
          alt={data.integration.name}
          className="dns-hole-controls-item-icon"
          style={{
            height: 30,
            width: 30,
            filter: !isConnected ? "grayscale(100%)" : undefined,
          }}
        />
        <Flex className="dns-hole-controls-item-data-stack" direction="column" gap={5}>
          <Text className="dns-hole-controls-item-integration-name" fz="md" fw={"bold"}>
            {data.integration.name}
          </Text>
          <Flex className="dns-hole-controls-item-controls" direction="row" gap="lg">
            <UnstyledButton
              className="dns-hole-controls-item-toggle-button"
              disabled={!controlEnabled}
              display="contents"
              style={{ cursor: controlEnabled ? "pointer" : "default" }}
              onClick={() => toggleDns(data.integration.id)}
            >
              <Badge
                className={`dns-hole-controls-item-toggle-button-styling${controlEnabled ? " hoverable-component clickable-component" : ""}`}
                bd="1px solid var(--border-color)"
                px="sm"
                h="lg"
                color="var(--background-color)"
                c="var(--mantine-color-text)"
                styles={{ section: { marginInlineEnd: "sm" }, root: { cursor: "inherit" } }}
                leftSection={
                  isConnected && (
                    <IconCircleFilled
                      className="dns-hole-controls-item-status-icon"
                      color={dnsLightStatus(isEnabled)}
                      size={16}
                    />
                  )
                }
              >
                {t(
                  `widget.dnsHoleControls.controls.${
                    !isConnected
                      ? "disconnected"
                      : typeof isEnabled === "undefined"
                        ? "processing"
                        : isEnabled
                          ? "enabled"
                          : "disabled"
                  }`,
                )}
              </Badge>
            </UnstyledButton>
          </Flex>
        </Flex>
        <ActionIcon
          className="dns-hole-controls-item-timer-button"
          display={isInteractPermitted ? undefined : "none"}
          disabled={!controlEnabled || !isEnabled}
          color="yellow"
          size={30}
          radius={board.itemRadius}
          bd={0}
          ms={"auto"}
          variant="subtle"
          onClick={() => {
            setSelectedIntegrationIds([data.integration.id]);
            open();
          }}
        >
          <IconClockPause className="dns-hole-controls-item-timer-icon" size={20} />
        </ActionIcon>
      </Flex>
    </Card>
  );
};
