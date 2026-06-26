"use client";

import { useMemo } from "react";
import { Badge, Box, Center, Divider, Group, Loader, ScrollArea, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconBellOff, IconCircleCheck, IconFlame, IconHistory } from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { LucideIcon } from "lucide-react";
import { Activity, Battery, Cpu, HardDrive, MemoryStick, Monitor, Network, Server, Thermometer } from "lucide-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { BeszelIntegrationErrorIndicator } from "../beszel/_shared/error-indicator";

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
}: WidgetComponentProps<"beszelAlerts">) {
  const t = useScopedI18n("widget.beszelAlerts");
  const alertsInput = useMemo(
    () => ({ integrationIds, includeHistory: options.showHistory, maxHistoryItems: options.maxHistoryItems }),
    [integrationIds, options.showHistory, options.maxHistoryItems],
  );
  const {
    data: results = [],
    error: alertsError,
    isPending,
  } = clientApi.widget.beszel.getAlerts.useQuery(alertsInput, {
    staleTime: 10_000,
    gcTime: 48 * 60 * 60 * 1000,
    refetchInterval: 10_000,
    retry: false,
  });
  const utils = clientApi.useUtils();

  clientApi.widget.beszel.subscribeAlerts.useSubscription(alertsInput, {
    enabled: !isEditMode,
    onData(data) {
      utils.widget.beszel.getAlerts.setData(alertsInput, (prev) => {
        if (!prev) return prev;
        return prev.map((r) =>
          r.integrationId === data.integrationId
            ? {
                ...r,
                alerts: data.alerts.alerts,
                history: data.alerts.history,
                updatedAt: data.timestamp,
              }
            : r,
        );
      });
    },
  });

  const systemNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of results) {
      if (r.systemNameMap) {
        Object.assign(map, r.systemNameMap);
      }
    }
    return map;
  }, [results]);

  const alerts = useMemo(
    () => results.flatMap((r) => r.alerts.map((a) => ({ ...a, _key: `${r.integrationId}:${a.id}` }))),
    [results],
  );

  const history = useMemo(() => {
    const all = results.flatMap((r) => r.history.map((h) => ({ ...h, _key: `${r.integrationId}:${h.id}` })));
    return all
      .toSorted((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .slice(0, options.maxHistoryItems);
  }, [results, options.maxHistoryItems]);

  const triggeredAlerts = alerts.filter((a) => a.triggered);
  const okAlerts = alerts.filter((a) => !a.triggered);

  if (alertsError) throw alertsError;

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
        <BeszelIntegrationErrorIndicator results={results} />
      </Box>
      <ScrollArea h="100%" style={{ pointerEvents: isEditMode ? "none" : undefined }}>
        <Stack gap="sm" p="sm">
          {alerts.length === 0 && (
            <Stack align="center" justify="center" py="xl" gap="xs">
              <ThemeIcon variant="light" color="gray" size="lg" radius="xl">
                <IconBellOff size={18} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">
                {t("empty")}
              </Text>
            </Stack>
          )}

          {triggeredAlerts.length > 0 && (
            <Stack gap={6}>
              <Group gap={6}>
                <IconFlame size={14} color="var(--mantine-color-red-6)" />
                <Text size="xs" fw={600} tt="uppercase" c="red">
                  {t("status.triggered")} ({triggeredAlerts.length})
                </Text>
              </Group>
              {triggeredAlerts.map((alert) => (
                <AlertRow
                  key={alert._key}
                  name={alert.name}
                  value={alert.value}
                  min={alert.min}
                  systemName={systemNameMap[alert.system] ?? alert.system}
                  triggered
                />
              ))}
            </Stack>
          )}

          {triggeredAlerts.length > 0 && okAlerts.length > 0 && <Divider />}

          {okAlerts.length > 0 && (
            <Stack gap={6}>
              <Group gap={6}>
                <IconCircleCheck size={14} color="var(--mantine-color-green-6)" />
                <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                  {t("status.ok")} ({okAlerts.length})
                </Text>
              </Group>
              {okAlerts.map((alert) => (
                <AlertRow
                  key={alert._key}
                  name={alert.name}
                  value={alert.value}
                  min={alert.min}
                  systemName={systemNameMap[alert.system] ?? alert.system}
                  triggered={false}
                />
              ))}
            </Stack>
          )}

          {options.showHistory && history.length > 0 && (
            <>
              <Divider />
              <Stack gap={6}>
                <Group gap={6}>
                  <IconHistory size={14} opacity={0.5} />
                  <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                    {t("history")}
                  </Text>
                </Group>
                {history.map((entry) => {
                  const systemName = systemNameMap[entry.system] ?? entry.system;
                  const isResolved = !!entry.resolved;
                  const HistoryIcon = alertIconMap[entry.name] ?? Server;
                  return (
                    <Group key={entry._key} justify="space-between" wrap="nowrap" gap="xs" pl={4}>
                      <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                        <Box
                          w={3}
                          h={24}
                          style={{ borderRadius: 2, flexShrink: 0 }}
                          bg={isResolved ? "green.6" : "red.6"}
                        />
                        <HistoryIcon size={12} opacity={0.5} style={{ flexShrink: 0 }} />
                        <Stack gap={0} style={{ minWidth: 0 }}>
                          <Text size="xs" fw={500} truncate>
                            {entry.name}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>
                            {systemName}
                          </Text>
                        </Stack>
                      </Group>
                      <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
                        <Badge size="xs" variant="dot" color={isResolved ? "green" : "red"}>
                          {isResolved ? t("resolved") : t("status.triggered")}
                        </Badge>
                        <Text size="10px" c="dimmed">
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
  triggered: boolean;
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

function formatAlertDescription(name: string, value: number, min: number): string {
  const suffix = unitSuffixMap[name] ?? "";
  if (name === "Status") return `down for ${min} min`;
  return `exceeds ${value}${suffix} over ${min} min`;
}

function AlertRow({ name, value, min, systemName, triggered }: AlertRowProps) {
  const Icon = alertIconMap[name] ?? Server;
  return (
    <Group
      wrap="nowrap"
      gap="xs"
      py={4}
      pr={8}
      pl={12}
      style={{
        borderRadius: "var(--mantine-radius-sm)",
        borderLeft: `3px solid var(--mantine-color-${triggered ? "red" : "green"}-6)`,
        backgroundColor: triggered ? "var(--mantine-color-red-light)" : "var(--mantine-color-default-hover)",
      }}
    >
      <Icon size={14} opacity={0.7} style={{ flexShrink: 0 }} />
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Group gap={6} wrap="nowrap">
          <Text size="xs" fw={600} truncate>
            {systemName}
          </Text>
          <Text size="xs" c="dimmed">
            ·
          </Text>
          <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            {name}
          </Text>
        </Group>
        <Text size="xs" c="dimmed" truncate>
          {formatAlertDescription(name, value, min)}
        </Text>
      </Stack>
    </Group>
  );
}
