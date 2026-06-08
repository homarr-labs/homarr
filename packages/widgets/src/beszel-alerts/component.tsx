"use client";

import { useMemo } from "react";
import { Badge, Card, Group, Indicator, ScrollArea, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconBell, IconCheck } from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

dayjs.extend(relativeTime);

const alertColorMap: Record<string, string> = {
  triggered: "red",
  ok: "green",
};

export default function BeszelAlertsWidget({
  options,
  integrationIds,
}: WidgetComponentProps<"beszelAlerts">) {
  const t = useScopedI18n("widget.beszelAlerts");
  const [results] = clientApi.widget.beszel.getAlerts.useSuspenseQuery({
    integrationIds,
    includeHistory: options.showHistory,
    maxHistoryItems: options.maxHistoryItems,
  });
  const utils = clientApi.useUtils();

  clientApi.widget.beszel.subscribeAlerts.useSubscription(
    { integrationIds, includeHistory: options.showHistory, maxHistoryItems: options.maxHistoryItems },
    {
      onData(data) {
        utils.widget.beszel.getAlerts.setData(
          { integrationIds, includeHistory: options.showHistory, maxHistoryItems: options.maxHistoryItems },
          (prev) => {
            if (!prev) return prev;
            return prev.map((r) =>
              r.integrationId === data.integrationId
                ? { ...r, alerts: data.alerts.alerts, history: data.alerts.history, updatedAt: data.timestamp }
                : r,
            );
          },
        );
      },
    },
  );

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
    return all.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()).slice(0, options.maxHistoryItems);
  }, [results, options.maxHistoryItems]);

  return (
    <ScrollArea h="100%">
      <Stack gap="xs" p="xs">
        {alerts.length === 0 && (
          <Group gap="xs" justify="center" py="md">
            <IconBell size={20} opacity={0.5} />
            <Text size="sm" c="dimmed">{t("empty")}</Text>
          </Group>
        )}

        {alerts.map((alert) => {
          const state = alert.triggered ? "triggered" : "ok";
          const systemName = systemNameMap[alert.system] ?? alert.system;
          return (
            <Card key={alert._key} padding="xs" radius="sm" withBorder>
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <Indicator color={alertColorMap[state]} size={8} processing={alert.triggered}>
                    {alert.triggered ? <IconAlertTriangle size={16} /> : <IconCheck size={16} />}
                  </Indicator>
                  <Stack gap={0}>
                    <Text size="xs" fw={500}>{alert.name} &gt; {alert.value}</Text>
                    <Text size="xs" c="dimmed">{systemName}</Text>
                  </Stack>
                </Group>
                <Badge size="xs" variant="light" color={alertColorMap[state]}>
                  {t(`status.${state}`)}
                </Badge>
              </Group>
            </Card>
          );
        })}

        {options.showHistory && history.length > 0 && (
          <>
            <Text size="xs" fw={600} c="dimmed" mt="xs">{t("history")}</Text>
            {history.map((entry) => {
              const systemName = systemNameMap[entry.system] ?? entry.system;
              return (
                <Card key={entry._key} padding="xs" radius="sm" withBorder>
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={0}>
                      <Text size="xs" fw={500}>{entry.name}</Text>
                      <Text size="xs" c="dimmed">{systemName}</Text>
                    </Stack>
                    <Text size="xs" c="dimmed">{dayjs(entry.created).fromNow()}</Text>
                  </Group>
                </Card>
              );
            })}
          </>
        )}
      </Stack>
    </ScrollArea>
  );
}
