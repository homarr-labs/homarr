"use client";

import { useMemo } from "react";
import { Badge, Box, Center, Divider, Group, Loader, ScrollArea, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconBellOff, IconCircleCheck, IconFlame, IconHistory } from "@tabler/icons-react";
import { getQueryKey } from "@trpc/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { LucideIcon } from "lucide-react";
import { Activity, Battery, Cpu, HardDrive, MemoryStick, Monitor, Network, Server, Thermometer } from "lucide-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { getBeszelAlertsQueryInput } from "./display";
import { buildBeszelSystemNameMap, getBeszelSystemName } from "./system-name-map";

const alertIconMap: Record<string, LucideIcon> = {
  CPU: Cpu,
  Memory: MemoryStick,
  Disk: HardDrive,
  Bandwidth: Network,
  Temperature: Thermometer,
  "Load Average": Activity,
  LoadAvg1: Activity,
  LoadAvg5: Activity,
  LoadAvg15: Activity,
  Status: Server,
  GPU: Monitor,
  Battery: Battery,
};

dayjs.extend(relativeTime);

export default function BeszelAlertsWidget({
  options,
  integrationIds,
  isEditMode,
  displayMode,
  widgetRuntimeRef,
}: WidgetComponentProps<"beszelAlerts">) {
  const t = useI18n("widget.beszelAlerts");
  const isAdvanced = displayMode === "advanced";
  const alertsInput = useMemo(
    () =>
      getBeszelAlertsQueryInput(
        integrationIds,
        { showHistory: options.showHistory, maxHistoryItems: options.maxHistoryItems },
        isAdvanced,
      ),
    [integrationIds, options.showHistory, options.maxHistoryItems, isAdvanced],
  );
  const alertsQuery = clientApi.widget.beszel.getAlerts.useQuery(alertsInput);
  const runtimeQueries = useMemo(
    () => [getQueryKey(clientApi.widget.beszel.getAlerts, alertsInput, "query")],
    [alertsInput],
  );
  useWidgetRuntimeQueries(widgetRuntimeRef, runtimeQueries);
  const resultData = getUsableWidgetQueryData(alertsQuery);
  const results = useMemo(() => resultData ?? [], [resultData]);
  const { isPending } = alertsQuery;

  const systemNameMap = useMemo(() => buildBeszelSystemNameMap(results), [results]);
  const showIntegrationName = isAdvanced || results.length > 1;

  const alerts = useMemo(
    () =>
      results.flatMap((r) =>
        r.alerts.map((a) => ({
          ...a,
          integrationId: r.integrationId,
          integrationName: r.integrationName,
          key: `${r.integrationId}:${a.id}`,
        })),
      ),
    [results],
  );

  const history = useMemo(() => {
    const all = results.flatMap((r) =>
      r.history.map((h) => ({
        ...h,
        integrationId: r.integrationId,
        integrationName: r.integrationName,
        key: `${r.integrationId}:${h.id}`,
      })),
    );
    const sorted = all.toSorted((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    return isAdvanced ? sorted : sorted.slice(0, options.maxHistoryItems);
  }, [results, options.maxHistoryItems, isAdvanced]);

  const triggeredAlerts = alerts.filter((a) => a.triggered);
  const okAlerts = alerts.filter((a) => !a.triggered);
  const showHistory = isAdvanced || options.showHistory;

  if (isPending) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Box h="100%" pos="relative">
      <Box pos="absolute" top={4} right={8} style={{ zIndex: 1 }}>
        <Group gap={0}>
          <IntegrationErrorIndicator results={results} />
        </Group>
      </Box>
      <ScrollArea h="100%" style={{ pointerEvents: isEditMode ? "none" : undefined }}>
        <Stack gap="sm" p="sm">
          {alerts.length === 0 && (
            <Stack align="center" justify="center" py="xl" gap="xs">
              <ThemeIcon variant="light" color="gray" size="lg" radius="xl">
                <IconBellOff size="var(--mantine-font-size-lg)" />
              </ThemeIcon>
              <Text size="sm" c="dimmed">
                {t("empty")}
              </Text>
            </Stack>
          )}

          {triggeredAlerts.length > 0 && (
            <Stack gap={6}>
              <Group gap={6}>
                <IconFlame size="var(--mantine-font-size-sm)" color="var(--mantine-color-red-6)" />
                <Text size="xs" fw={600} c="red" tt={isAdvanced ? undefined : "uppercase"}>
                  {t("status.triggered")} ({triggeredAlerts.length})
                </Text>
              </Group>
              {triggeredAlerts.map((alert) => (
                <AlertRow
                  key={alert.key}
                  name={alert.name}
                  value={alert.value}
                  min={alert.min}
                  systemName={getBeszelSystemName(systemNameMap, alert.integrationId, alert.system)}
                  integrationName={showIntegrationName ? alert.integrationName : undefined}
                  triggered
                  isAdvanced={isAdvanced}
                />
              ))}
            </Stack>
          )}

          {triggeredAlerts.length > 0 && okAlerts.length > 0 && <Divider />}

          {okAlerts.length > 0 && (
            <Stack gap={6}>
              <Group gap={6}>
                <IconCircleCheck size="var(--mantine-font-size-sm)" color="var(--mantine-color-green-6)" />
                <Text size="xs" fw={600} c="dimmed" tt={isAdvanced ? undefined : "uppercase"}>
                  {t("status.ok")} ({okAlerts.length})
                </Text>
              </Group>
              {okAlerts.map((alert) => (
                <AlertRow
                  key={alert.key}
                  name={alert.name}
                  value={alert.value}
                  min={alert.min}
                  systemName={getBeszelSystemName(systemNameMap, alert.integrationId, alert.system)}
                  integrationName={showIntegrationName ? alert.integrationName : undefined}
                  triggered={false}
                  isAdvanced={isAdvanced}
                />
              ))}
            </Stack>
          )}

          {showHistory && history.length > 0 && (
            <>
              <Divider />
              <Stack gap={6}>
                <Group gap={6}>
                  <IconHistory size="var(--mantine-font-size-sm)" opacity={0.5} />
                  <Text size="xs" fw={600} c="dimmed" tt={isAdvanced ? undefined : "uppercase"}>
                    {t("history")}
                  </Text>
                </Group>
                {history.map((entry) => {
                  const systemName = getBeszelSystemName(systemNameMap, entry.integrationId, entry.system);
                  const systemLabel = showIntegrationName ? `${systemName} · ${entry.integrationName}` : systemName;
                  const isResolved = !!entry.resolved;
                  const HistoryIcon = alertIconMap[entry.name] ?? Server;
                  return (
                    <Group key={entry.key} justify="space-between" wrap="nowrap" gap="xs" pl={4}>
                      <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                        <Box
                          w={3}
                          h={24}
                          style={{ borderRadius: 2, flexShrink: 0 }}
                          bg={isResolved ? "green.6" : "red.6"}
                        />
                        <HistoryIcon size="var(--mantine-font-size-xs)" opacity={0.5} style={{ flexShrink: 0 }} />
                        <Stack gap={0} style={{ minWidth: 0 }}>
                          <Text size="xs" fw={500} truncate>
                            {entry.name}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>
                            {systemLabel}
                          </Text>
                        </Stack>
                      </Group>
                      <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
                        <Badge size="xs" variant="dot" color={isResolved ? "green" : "red"}>
                          {isResolved ? t("resolved") : t("status.triggered")}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {dayjs(entry.created).fromNow()}
                        </Text>
                      </Stack>
                    </Group>
                  );
                })}
              </Stack>
            </>
          )}
        </Stack>
      </ScrollArea>
    </Box>
  );
}

interface AlertRowProps {
  name: string;
  value: number;
  min: number;
  systemName: string;
  integrationName?: string;
  triggered: boolean;
  isAdvanced: boolean;
}

const unitSuffixMap: Record<string, string> = {
  CPU: "%",
  Memory: "%",
  Disk: "%",
  GPU: "%",
  Battery: "%",
  Temperature: "°",
  Bandwidth: " MB/s",
  "Load Average": "",
  LoadAvg1: "",
  LoadAvg5: "",
  LoadAvg15: "",
  Status: "",
};

function AlertRow({ name, value, min, systemName, integrationName, triggered, isAdvanced }: AlertRowProps) {
  const t = useI18n("widget.beszelAlerts");
  const Icon = alertIconMap[name] ?? Server;
  const suffix = unitSuffixMap[name] ?? "";
  let description = t("description.threshold", { value: `${value}${suffix}`, minutes: min });
  if (name === "Status") {
    description = t("description.statusDuration", { minutes: min });
  }
  const accentColor = triggered ? "red" : "green";
  const borderColor = triggered ? "red" : "gray";
  const rowStyle = isAdvanced
    ? {
        borderRadius: "var(--mantine-radius-sm)",
        border: `1px solid var(--mantine-color-${borderColor}-4)`,
        backgroundColor: triggered ? "var(--mantine-color-red-light)" : "var(--mantine-color-default-hover)",
      }
    : {
        borderRadius: "var(--mantine-radius-sm)",
        borderLeft: `3px solid var(--mantine-color-${accentColor}-6)`,
        backgroundColor: triggered ? "var(--mantine-color-red-light)" : "var(--mantine-color-default-hover)",
      };
  return (
    <Group wrap="nowrap" gap="xs" py={4} pr={8} pl={isAdvanced ? 8 : 12} style={rowStyle}>
      <Icon size="var(--mantine-font-size-sm)" opacity={0.7} style={{ flexShrink: 0 }} />
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Group gap={6} wrap="nowrap">
          <Text size="xs" fw={600} truncate>
            {integrationName ? `${systemName} · ${integrationName}` : systemName}
          </Text>
          <Text size="xs" c="dimmed">
            ·
          </Text>
          <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            {name}
          </Text>
        </Group>
        <Text size="xs" c="dimmed" truncate>
          {description}
        </Text>
      </Stack>
    </Group>
  );
}
