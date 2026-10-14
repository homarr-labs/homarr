"use client";

import "../../widgets-common.css";

import { useState } from "react";
import type { ComponentType, CSSProperties } from "react";
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
import { IconCircleFilled, IconClockPause, IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";
import combineClasses from "clsx";

import { useIntegrationConnected } from "@homarr/common";
import { integrationDefs } from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import actionTargetClasses from "../../common/action-target.module.css";
import classes from "./component.module.css";
import TimerPopover from "./timer-popover";

const dnsLightStatus = (enabled: boolean | undefined) =>
  `var(--mantine-color-${typeof enabled === "undefined" ? "blue" : enabled ? "green" : "red"}-6`;

export interface AvailableDnsSummaryResult {
  summary: DnsHoleSummary;
  integration: { id: string; name: string; kind: IntegrationKind; updatedAt: Date };
}

export interface DnsHoleControlsViewProps {
  options: { showToggleAllButtons: boolean };
  isEditMode: boolean;
  width: number;
  displayMode?: "compact" | "advanced";
  summaries: AvailableDnsSummaryResult[];
  summaryResults: { integrationId: string; integrationName?: string; error?: string }[];
  integrationsWithInteractions: string[];
  integrationsSummaries: { enabled: string[]; disabled: string[] };
  mutationPending: boolean;
  actionError: unknown;
  isInitialPending: boolean;
  toggleDns: (integrationId: string) => Promise<void>;
  disableDns: (input: { integrationId: string; duration: number }) => Promise<unknown>;
  itemRadius: string | undefined;
  hasIconColor: boolean;
  MaskedOrNormalImage: ComponentType<{
    imageUrl: string;
    hasColor: boolean;
    alt: string;
    className?: string;
    style?: CSSProperties;
  }>;
}

export function DnsHoleControlsView({
  options,
  isEditMode,
  width,
  displayMode,
  summaries,
  summaryResults,
  integrationsWithInteractions,
  integrationsSummaries,
  mutationPending,
  actionError,
  isInitialPending,
  toggleDns,
  disableDns,
  itemRadius,
  hasIconColor,
  MaskedOrNormalImage,
}: DnsHoleControlsViewProps) {
  const t = useI18n("widget.dnsHoleControls");

  const [bulkPending, setBulkPending] = useState(false);
  const [bulkFailureCount, setBulkFailureCount] = useState(0);

  const controlAllButtonsVisible = options.showToggleAllButtons && integrationsWithInteractions.length > 0;
  const actionsPending = bulkPending || mutationPending;
  const runBulkToggle = async (integrationIdsToToggle: string[]) => {
    setBulkPending(true);
    setBulkFailureCount(0);
    const results = await Promise.allSettled(integrationIdsToToggle.map(toggleDns));
    setBulkFailureCount(results.filter(({ status }) => status === "rejected").length);
    setBulkPending(false);
  };

  if (isInitialPending) return <WidgetQueryLoadingState />;

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
        </Group>
      </Box>
      {controlAllButtonsVisible && (
        <Flex className="dns-hole-controls-buttons" gap="sm">
          <Tooltip label={t("controls.enableAll")}>
            <Button
              aria-label={t("controls.enableAll")}
              size="xs"
              p={0}
              className="dns-hole-controls-enable-all-button"
              onClick={() => void runBulkToggle(integrationsSummaries.disabled)}
              disabled={integrationsSummaries.disabled.length === 0 || actionsPending}
              variant="light"
              color="green"
              bd={0}
              radius={itemRadius}
              flex={1}
            >
              <IconPlayerPlay className="dns-hole-controls-enable-all-icon" size="var(--mantine-font-size-md)" />
            </Button>
          </Tooltip>

          <TimerPopover
            target={(onClick) => (
              <Tooltip label={t("controls.setTimer")}>
                <Button
                  aria-label={t("controls.setTimer")}
                  size="xs"
                  p={0}
                  className="dns-hole-controls-timer-all-button"
                  disabled={integrationsSummaries.enabled.length === 0 || actionsPending}
                  variant="light"
                  color="yellow"
                  bd={0}
                  radius={itemRadius}
                  flex={1}
                  onClick={onClick}
                >
                  <IconClockPause className="dns-hole-controls-timer-all-icon" size="var(--mantine-font-size-md)" />
                </Button>
              </Tooltip>
            )}
            selectedIntegrationIds={integrationsSummaries.enabled}
            disableDns={(input) => void disableDns(input).catch(() => undefined)}
          />

          <Tooltip label={t("controls.disableAll")}>
            <Button
              aria-label={t("controls.disableAll")}
              size="xs"
              p={0}
              className="dns-hole-controls-disable-all-button"
              onClick={() => void runBulkToggle(integrationsSummaries.enabled)}
              disabled={integrationsSummaries.enabled.length === 0 || actionsPending}
              variant="light"
              color="red"
              bd={0}
              radius={itemRadius}
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
              disableDns={(input) => void disableDns(input).catch(() => undefined)}
              data={summary}
              t={t}
              hasIconColor={hasIconColor}
              itemRadius={itemRadius}
              MaskedOrNormalImage={MaskedOrNormalImage}
              rootWidth={width}
              isAdvanced={displayMode === "advanced"}
              actionsPending={actionsPending}
            />
          ))}
        </Stack>
      </ScrollArea.Autosize>

      {bulkFailureCount > 0 && (
        <Text size="xs" c="red" ta="center">
          {t("error.bulkActionsFailed", { count: bulkFailureCount })}
        </Text>
      )}
      {Boolean(actionError) && (
        <Tooltip label={t("error.internalServerError")}>
          <Text size="xs" c="red" ta="center" lineClamp={2} tabIndex={0}>
            {t("error.internalServerError")}
          </Text>
        </Tooltip>
      )}
    </Stack>
  );
}

interface ControlsCardProps {
  integrationsWithInteractions: string[];
  toggleDns: (integrationId: string) => Promise<void>;
  disableDns: (data: { duration: number; integrationId: string }) => void;
  data: AvailableDnsSummaryResult;
  t: ReturnType<typeof useI18n<"widget.dnsHoleControls">>;
  hasIconColor: boolean;
  rootWidth: number;
  isAdvanced: boolean;
  actionsPending: boolean;
  itemRadius: string | undefined;
  MaskedOrNormalImage: DnsHoleControlsViewProps["MaskedOrNormalImage"];
}

const ControlsCard: React.FC<ControlsCardProps> = ({
  integrationsWithInteractions,
  toggleDns,
  disableDns,
  data,
  t,
  hasIconColor,
  rootWidth,
  isAdvanced,
  actionsPending,
  itemRadius,
  MaskedOrNormalImage,
}) => {
  const isConnected = useIntegrationConnected(data.integration.updatedAt, { timeout: 30000 });
  const isEnabled = data.summary.status ? data.summary.status === "enabled" : undefined;
  const isInteractPermitted = integrationsWithInteractions.includes(data.integration.id);
  const controlEnabled = isInteractPermitted && isEnabled !== undefined && isConnected && !actionsPending;

  const iconUrl = integrationDefs[data.integration.kind].iconUrl;
  const layout = !isAdvanced && rootWidth < 256 ? "sm" : "md";

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
        radius={itemRadius}
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
                      aria-label={`${t("controls.enableAll")}: ${data.integration.name}`}
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
                      aria-label={`${t("controls.disableAll")}: ${data.integration.name}`}
                      onClick={() => void toggleDns(data.integration.id).catch(() => undefined)}
                      disabled={!controlEnabled}
                      size="sm"
                      color="red"
                      variant="light"
                    >
                      <IconPlayerStop size="var(--mantine-font-size-xs)" />
                    </ActionIcon>
                  )}
                  <TimerPopover
                    target={(onClick) => (
                      <ActionIcon
                        className={actionTargetClasses.root}
                        aria-label={`${t("controls.setTimer")}: ${data.integration.name}`}
                        size="sm"
                        color="yellow"
                        variant="light"
                        display={isInteractPermitted ? undefined : "none"}
                        disabled={!controlEnabled || !isEnabled}
                        onClick={onClick}
                      >
                        <IconClockPause size="var(--mantine-font-size-xs)" />
                      </ActionIcon>
                    )}
                    selectedIntegrationIds={[data.integration.id]}
                    disableDns={disableDns}
                  />
                </Group>
              )}
              {layout === "md" && (
                <UnstyledButton
                  aria-label={`${
                    isEnabled ? t("controls.disableAll") : t("controls.enableAll")
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
                      `controls.${
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
            <TimerPopover
              target={(onClick) => (
                <ActionIcon
                  aria-label={`${t("controls.setTimer")}: ${data.integration.name}`}
                  className={combineClasses("dns-hole-controls-item-timer-button", actionTargetClasses.root)}
                  display={isInteractPermitted ? undefined : "none"}
                  disabled={!controlEnabled || !isEnabled}
                  color="yellow"
                  size={30}
                  radius={itemRadius}
                  bd={0}
                  ms={"auto"}
                  variant="subtle"
                  onClick={onClick}
                >
                  <IconClockPause className="dns-hole-controls-item-timer-icon" size="var(--mantine-font-size-xl)" />
                </ActionIcon>
              )}
              selectedIntegrationIds={[data.integration.id]}
              disableDns={disableDns}
            />
          )}
        </Flex>
      </Card>
    </Indicator>
  );
};
