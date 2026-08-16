"use client";

import "../../widgets-common.css";

import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Group,
  Indicator,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
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
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../../common/query-state";
import { WidgetQueryErrorIndicator } from "../../common/query-state-indicator";
import actionTargetClasses from "../../common/action-target.module.css";
import classes from "./component.module.css";
import TimerModal from "./TimerModal";

const dnsLightStatus = (enabled: boolean | undefined) =>
  `var(--mantine-color-${typeof enabled === "undefined" ? "blue" : enabled ? "green" : "red"}-6`;

type DnsSummaryResult = RouterOutputs["widget"]["dnsHole"]["summary"][number];
type AvailableDnsSummaryResult = DnsSummaryResult & {
  summary: NonNullable<DnsSummaryResult["summary"]>;
  integration: DnsSummaryResult["integration"] & { updatedAt: Date };
};

const isAvailableDnsSummaryResult = (result: DnsSummaryResult): result is AvailableDnsSummaryResult =>
  result.summary !== null && result.integration.updatedAt !== undefined;

export default function DnsHoleControlsWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  height,
}: WidgetComponentProps<typeof widgetKind>) {
  const board = useRequiredBoard();
  // DnsHole integrations with interaction permissions
  const integrationsWithInteractions = useIntegrationsWithInteractAccess()
    .map(({ id }) => id)
    .filter((id) => integrationIds.includes(id));

  const summaryQuery = clientApi.widget.dnsHole.summary.useQuery({ integrationIds });
  const summaryResults = getUsableWidgetQueryData(summaryQuery) ?? [];
  const summaries = summaryResults.filter(isAvailableDnsSummaryResult);
  const { isPending: isSummaryPending } = summaryQuery;
  const utils = clientApi.useUtils();

  const {
    mutateAsync: enableDns,
    isPending: isEnabling,
    error: enableError,
  } = clientApi.widget.dnsHole.enable.useMutation({
    onSettled: () => void utils.widget.dnsHole.summary.invalidate(),
  });
  const {
    mutateAsync: disableDns,
    isPending: isDisabling,
    error: disableError,
  } = clientApi.widget.dnsHole.disable.useMutation({
    onSettled: () => void utils.widget.dnsHole.summary.invalidate(),
  });
  const toggleDns = async (integrationId: string) => {
    const integrationStatus = summaries.find(({ integration }) => integration.id === integrationId);
    if (!integrationStatus?.summary.status) return;
    utils.widget.dnsHole.summary.setData(
      {
        integrationIds,
      },
      (prevData) => {
        if (!prevData) return [];

        return prevData.map((item) =>
          item.integration.id === integrationId && item.summary
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
      await disableDns({ integrationId, duration: 0 });
    } else {
      await enableDns({ integrationId });
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
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkFailureCount, setBulkFailureCount] = useState(0);
  const [opened, { close, open }] = useDisclosure(false);

  const controlAllButtonsVisible = options.showToggleAllButtons && integrationsWithInteractions.length > 0;
  const actionsPending = bulkPending || isEnabling || isDisabling;
  const actionError = enableError ?? disableError;
  const runBulkToggle = async (integrationIdsToToggle: string[]) => {
    setBulkPending(true);
    setBulkFailureCount(0);
    const results = await Promise.allSettled(integrationIdsToToggle.map(toggleDns));
    setBulkFailureCount(results.filter(({ status }) => status === "rejected").length);
    setBulkPending(false);
  };

  if (isSummaryPending) {
    return (
      <Stack h="100%" justify="center" align="center">
        <Text c="dimmed" size="sm">
          {t("common.action.loading")}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack
      className="dns-hole-controls-stack"
      justify="space-between"
      h="100%"
      p="sm"
      gap="sm"
      style={{ pointerEvents: isEditMode ? "none" : undefined }}
      pos="relative"
    >
      <Box pos="absolute" top={4} right={4} style={{ zIndex: 2 }}>
        <Group gap={0}>
          <IntegrationErrorIndicator results={summaryResults} />
          <WidgetQueryErrorIndicator error={summaryQuery.error} label={t("widget.dnsHoleControls.name")} />
        </Group>
      </Box>
      {controlAllButtonsVisible && (
        <Flex className="dns-hole-controls-buttons" gap="sm">
          <Tooltip label={t("widget.dnsHoleControls.controls.enableAll")}>
            <Button
              aria-label={t("widget.dnsHoleControls.controls.enableAll")}
              size="xs"
              p={0}
              className="dns-hole-controls-enable-all-button"
              onClick={() => void runBulkToggle(integrationsSummaries.disabled)}
              disabled={integrationsSummaries.disabled.length === 0 || actionsPending}
              variant="light"
              color="green"
              bd={0}
              radius={board.itemRadius}
              flex={1}
            >
              <IconPlayerPlay className="dns-hole-controls-enable-all-icon" size="var(--mantine-font-size-md)" />
            </Button>
          </Tooltip>

          <Tooltip label={t("widget.dnsHoleControls.controls.setTimer")}>
            <Button
              aria-label={t("widget.dnsHoleControls.controls.setTimer")}
              size="xs"
              p={0}
              className="dns-hole-controls-timer-all-button"
              onClick={() => {
                setSelectedIntegrationIds(integrationsSummaries.enabled);
                open();
              }}
              disabled={integrationsSummaries.enabled.length === 0 || actionsPending}
              variant="light"
              color="yellow"
              bd={0}
              radius={board.itemRadius}
              flex={1}
            >
              <IconClockPause className="dns-hole-controls-timer-all-icon" size="var(--mantine-font-size-md)" />
            </Button>
          </Tooltip>

          <Tooltip label={t("widget.dnsHoleControls.controls.disableAll")}>
            <Button
              aria-label={t("widget.dnsHoleControls.controls.disableAll")}
              size="xs"
              p={0}
              className="dns-hole-controls-disable-all-button"
              onClick={() => void runBulkToggle(integrationsSummaries.enabled)}
              disabled={integrationsSummaries.enabled.length === 0 || actionsPending}
              variant="light"
              color="red"
              bd={0}
              radius={board.itemRadius}
              flex={1}
            >
              <IconPlayerStop className="dns-hole-controls-disable-all-icon" size="var(--mantine-font-size-md)" />
            </Button>
          </Tooltip>
        </Flex>
      )}

      <ScrollArea.Autosize className="dns-hole-controls-integration-list-scroll-area flexed-scroll-area">
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
              rootWidth={width}
              rootHeight={height}
              actionsPending={actionsPending}
            />
          ))}
        </Stack>
      </ScrollArea.Autosize>

      {bulkFailureCount > 0 && (
        <Text size="xs" c="red" ta="center">
          {t("widget.dnsHoleControls.error.bulkActionsFailed", { count: bulkFailureCount })}
        </Text>
      )}
      {actionError && (
        <Tooltip label={t("widget.dnsHoleControls.error.internalServerError")}>
          <Text size="xs" c="red" ta="center" lineClamp={2} tabIndex={0}>
            {t("widget.dnsHoleControls.error.internalServerError")}
          </Text>
        </Tooltip>
      )}

      <TimerModal
        opened={opened}
        close={close}
        selectedIntegrationIds={selectedIntegrationIds}
        disableDns={(input) => void disableDns(input).catch(() => undefined)}
      />
    </Stack>
  );
}

interface ControlsCardProps {
  integrationsWithInteractions: string[];
  toggleDns: (integrationId: string) => Promise<void>;
  data: AvailableDnsSummaryResult;
  setSelectedIntegrationIds: (integrationId: string[]) => void;
  open: () => void;
  t: TranslationFunction;
  hasIconColor: boolean;
  rootWidth: number;
  rootHeight: number;
  actionsPending: boolean;
}

const ControlsCard: React.FC<ControlsCardProps> = ({
  integrationsWithInteractions,
  toggleDns,
  data,
  setSelectedIntegrationIds,
  open,
  t,
  hasIconColor,
  rootWidth,
  rootHeight,
  actionsPending,
}) => {
  const isConnected = useIntegrationConnected(data.integration.updatedAt, { timeout: 30000 });
  const isEnabled = data.summary.status ? data.summary.status === "enabled" : undefined;
  const isInteractPermitted = integrationsWithInteractions.includes(data.integration.id);
  // Use all factors to infer the state of the action buttons
  const controlEnabled = isInteractPermitted && isEnabled !== undefined && isConnected && !actionsPending;
  const board = useRequiredBoard();

  const iconUrl = integrationDefs[data.integration.kind].iconUrl;
  const layout = rootWidth < 256 || rootHeight < 112 ? "sm" : "md";

  return (
    <Indicator
      disabled={!isConnected || layout !== "sm"}
      color={dnsLightStatus(isEnabled)}
      position="top-end"
      offset={14}
    >
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
        <Flex className="dns-hole-controls-item-container" gap="md" align="center" direction="row" w="100%">
          {layout === "md" && (
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
          )}

          <Flex className="dns-hole-controls-item-data-stack" direction="column" w="100%" gap={5}>
            <Group gap="xs" align="center" wrap="nowrap">
              {layout === "sm" && (
                <MaskedOrNormalImage
                  imageUrl={iconUrl}
                  hasColor={hasIconColor}
                  alt={data.integration.name}
                  className="dns-hole-controls-item-icon"
                  style={{
                    height: 16,
                    width: 16,
                    filter: !isConnected ? "grayscale(100%)" : undefined,
                  }}
                />
              )}
              <Text className="dns-hole-controls-item-integration-name" fz="sm">
                {data.integration.name}
              </Text>
            </Group>
            <Flex className="dns-hole-controls-item-controls" direction="row" gap="sm" w="100%">
              {layout === "sm" && (
                <Group gap="xs" grow wrap="nowrap" w="100%">
                  {!isEnabled ? (
                    <ActionIcon
                      className={actionTargetClasses.root}
                      aria-label={`${t("widget.dnsHoleControls.controls.enableAll")}: ${data.integration.name}`}
                      onClick={() => void toggleDns(data.integration.id).catch(() => undefined)}
                      disabled={!controlEnabled}
                      size="sm"
                      color="green"
                      variant="light"
                    >
                      <IconPlayerPlay size="var(--mantine-font-size-xs)" />
                    </ActionIcon>
                  ) : (
                    <ActionIcon
                      className={actionTargetClasses.root}
                      aria-label={`${t("widget.dnsHoleControls.controls.disableAll")}: ${data.integration.name}`}
                      onClick={() => void toggleDns(data.integration.id).catch(() => undefined)}
                      disabled={!controlEnabled}
                      size="sm"
                      color="red"
                      variant="light"
                    >
                      <IconPlayerStop size="var(--mantine-font-size-xs)" />
                    </ActionIcon>
                  )}
                  <ActionIcon
                    className={actionTargetClasses.root}
                    aria-label={`${t("widget.dnsHoleControls.controls.setTimer")}: ${data.integration.name}`}
                    onClick={() => {
                      setSelectedIntegrationIds([data.integration.id]);
                      open();
                    }}
                    size="sm"
                    color="yellow"
                    variant="light"
                    display={isInteractPermitted ? undefined : "none"}
                    disabled={!controlEnabled || !isEnabled}
                  >
                    <IconClockPause size="var(--mantine-font-size-xs)" />
                  </ActionIcon>
                </Group>
              )}
              {layout === "md" && (
                <UnstyledButton
                  aria-label={`${
                    isEnabled
                      ? t("widget.dnsHoleControls.controls.disableAll")
                      : t("widget.dnsHoleControls.controls.enableAll")
                  }: ${data.integration.name}`}
                  className="dns-hole-controls-item-toggle-button"
                  disabled={!controlEnabled}
                  display="contents"
                  style={{ cursor: controlEnabled ? "pointer" : "default" }}
                  onClick={() => void toggleDns(data.integration.id).catch(() => undefined)}
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
                          size="var(--mantine-font-size-md)"
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
              )}
            </Flex>
          </Flex>
          {layout === "md" && (
            <ActionIcon
              aria-label={`${t("widget.dnsHoleControls.controls.setTimer")}: ${data.integration.name}`}
              className={combineClasses("dns-hole-controls-item-timer-button", actionTargetClasses.root)}
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
              <IconClockPause className="dns-hole-controls-item-timer-icon" size="var(--mantine-font-size-xl)" />
            </ActionIcon>
          )}
        </Flex>
      </Card>
    </Indicator>
  );
};
