"use client";

import type { CSSProperties } from "react";

import { Badge, Card, Center, Group, List, ScrollArea, SimpleGrid, Stack, Text, useMantineTheme } from "@mantine/core";
import { IconCircleCheckFilled, IconCircleXFilled } from "@tabler/icons-react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import objectSupport from "dayjs/plugin/objectSupport";
import relativeTime from "dayjs/plugin/relativeTime";

import { clientApi } from "@homarr/api/client";
import type { TranslationFunction } from "@homarr/translation";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import type { WidgetComponentProps } from "../../definition";
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import { getBinaryStatusKey } from "../../common/locale";
import { getUsableWidgetQueryData } from "../../common/query-state";
import { WidgetQueryErrorIndicator } from "../../common/query-state-indicator";
import type { NetworkControllerMatrixMetricKey, NetworkControllerMatrixSectionKey } from "./display";
import { getNetworkControllerMatrix } from "./display";

dayjs.extend(objectSupport);
dayjs.extend(relativeTime);
dayjs.extend(duration);

export default function NetworkControllerSummaryWidget({
  integrationIds,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"networkControllerSummary">) {
  const summaryQuery = clientApi.widget.networkController.summary.useQuery({
    integrationIds,
  });
  const results = getUsableWidgetQueryData(summaryQuery) ?? [];
  const summaries = results.filter(
    (result): result is typeof result & { summary: NonNullable<typeof result.summary>; updatedAt: Date } =>
      result.summary !== null && result.updatedAt !== undefined,
  );
  const { isPending } = summaryQuery;

  const t = useI18n();
  const locale = useCurrentIntlLocale();
  const statusLabels = {
    enabled: t("widget.dnsHoleSummary.status.enabled"),
    disabled: t("widget.dnsHoleSummary.status.disabled"),
    unknown: t("widget.dnsHoleSummary.status.unknown"),
  };

  const isDense = height < 160;
  const showDetails = height >= 180 && width >= 240;
  const columns = width >= 720 ? 2 : 1;
  const isAdvanced = displayMode === "advanced";
  const queryIndicators = (
    <Group gap={0} justify="flex-end">
      <IntegrationErrorIndicator results={results} />
      <WidgetQueryErrorIndicator error={summaryQuery.error} label={t("widget.networkControllerSummary.name")} />
    </Group>
  );

  if (isPending || summaries.length === 0) {
    return (
      <Stack h="100%" gap={0}>
        {queryIndicators}
        <Center p="sm" style={{ flex: 1 }}>
          <Text c="dimmed" size="sm" ta="center">
            {isPending
              ? t("common.action.loading")
              : t("widget.networkControllerSummary.error.integrationsDisconnected")}
          </Text>
        </Center>
      </Stack>
    );
  }

  if (isAdvanced) {
    const controllerColumns = width >= 960 ? 2 : 1;
    const matrixColumns = width >= 720 ? 3 : width >= 440 ? 2 : 1;

    return (
      <ScrollArea h="100%" p="sm" pos="relative">
        {queryIndicators}
        <SimpleGrid cols={controllerColumns} spacing="sm">
          {summaries.map(({ integration, summary, updatedAt }) => (
            <Card key={integration.id} p="sm" withBorder>
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <Text fw={600} size="sm" truncate="end">
                      {integration.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {integration.kind}
                    </Text>
                  </Stack>
                  <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
                    <Text size="10px" c="dimmed">
                      {t("widget.networkControllerSummary.advanced.updated")}
                    </Text>
                    <Text size="xs" c="dimmed" ta="right">
                      {new Date(updatedAt).toLocaleString(locale)}
                    </Text>
                  </Stack>
                </Group>
                <SimpleGrid cols={matrixColumns} spacing="xs">
                  {getNetworkControllerMatrix(summary).map((section) => (
                    <Card key={section.key} p="xs" withBorder>
                      <Stack gap="xs">
                        <Group justify="space-between" wrap="nowrap">
                          <Group gap={6} wrap="nowrap">
                            <StatusIcon
                              status={section.status}
                              label={statusLabels[getBinaryStatusKey(section.status)]}
                              style={iconSizes.md}
                            />
                            <Text size="sm" fw={600}>
                              {getMatrixSectionLabel(section.key, t)}
                            </Text>
                          </Group>
                          <Text size="xs" c="dimmed">
                            {statusLabels[getBinaryStatusKey(section.status)]}
                          </Text>
                        </Group>
                        {section.metrics.length > 0 && (
                          <SimpleGrid cols={2} spacing={4} verticalSpacing={2}>
                            {section.metrics.map((metric) => (
                              <Stack key={metric.key} gap={0}>
                                <Text size="10px" c="dimmed">
                                  {getMatrixMetricLabel(metric.key, t)}
                                </Text>
                                <Text size="xs" fw={500}>
                                  {formatMatrixMetric(metric.key, metric.value)}
                                </Text>
                              </Stack>
                            ))}
                          </SimpleGrid>
                        )}
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea h="100%" p={isDense ? "xs" : "sm"}>
      {queryIndicators}
      <SimpleGrid cols={columns} spacing="sm">
        {summaries.map(({ integration, summary }) => (
          <Card key={integration.id} p={isDense ? "xs" : "sm"} withBorder={summaries.length > 1}>
            <Stack gap="xs">
              {summaries.length > 1 && (
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={600} size="sm" truncate="end">
                    {integration.name}
                  </Text>
                  <Badge size="xs" variant="light">
                    {integration.kind}
                  </Badge>
                </Group>
              )}
              <List spacing={isDense ? 2 : "xs"} center size={isDense ? "sm" : undefined}>
                <List.Item
                  icon={
                    <StatusIcon
                      status={summary.wanStatus}
                      label={statusLabels[getBinaryStatusKey(summary.wanStatus)]}
                      size={isDense ? 16 : 20}
                    />
                  }
                >
                  {t("widget.networkControllerSummary.card.wan")}
                </List.Item>
                <List.Item
                  icon={
                    <StatusIcon
                      status={summary.www.status}
                      label={statusLabels[getBinaryStatusKey(summary.www.status)]}
                      size={isDense ? 16 : 20}
                    />
                  }
                >
                  <Text>
                    {t("widget.networkControllerSummary.card.web")}
                    <Text c="dimmed" size="sm" ms="xs" span>
                      {summary.www.latency}ms{showDetails ? ` · ${summary.www.ping}ms` : ""}
                    </Text>
                  </Text>
                </List.Item>
                <List.Item
                  icon={
                    <StatusIcon
                      status={summary.wifi.status}
                      label={statusLabels[getBinaryStatusKey(summary.wifi.status)]}
                      size={isDense ? 16 : 20}
                    />
                  }
                >
                  {t("widget.networkControllerSummary.card.wifi")}
                  {showDetails ? ` · ${summary.wifi.users + summary.wifi.guests}` : ""}
                </List.Item>
                {showDetails && (
                  <List.Item
                    icon={
                      <StatusIcon
                        status={summary.lan.status}
                        label={statusLabels[getBinaryStatusKey(summary.lan.status)]}
                        style={iconSizes.xl}
                      />
                    }
                  >
                    {t("widget.networkControllerSummary.card.lan")} · {summary.lan.users + summary.lan.guests}
                  </List.Item>
                )}
                <List.Item
                  icon={
                    <StatusIcon
                      status={summary.vpn.status}
                      label={statusLabels[getBinaryStatusKey(summary.vpn.status)]}
                      size={isDense ? 16 : 20}
                    />
                  }
                >
                  <Text>
                    {t("widget.networkControllerSummary.card.vpn.label")}
                    <Text c="dimmed" size="sm" ms="xs" span>
                      {t("widget.networkControllerSummary.card.vpn.countConnected", { count: summary.vpn.users })}
                    </Text>
                  </Text>
                </List.Item>
              </List>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </ScrollArea>
  );
}

const getMatrixMetricLabel = (key: NetworkControllerMatrixMetricKey, t: TranslationFunction) =>
  t(`widget.networkControllerSummary.advanced.metric.${key}`);

const formatMatrixMetric = (key: NetworkControllerMatrixMetricKey, value: number) => {
  if (key === "latency" || key === "ping") return `${value}ms`;
  if (key === "uptime") return dayjs.duration(value, "seconds").humanize();
  return String(value);
};

const getMatrixSectionLabel = (key: NetworkControllerMatrixSectionKey, t: TranslationFunction) => {
  if (key === "vpn") return t("widget.networkControllerSummary.card.vpn.label");
  return t(`widget.networkControllerSummary.card.${key}`);
};

const StatusIcon = ({
  status,
  label,
  size,
  style,
}: {
  status?: "enabled" | "disabled";
  label: string;
  size?: number;
  style?: CSSProperties;
}) => {
  const mantineTheme = useMantineTheme();
  if (status === "enabled") {
    return <IconCircleCheckFilled aria-label={label} size={size} style={style} color={mantineTheme.colors.green[6]} />;
  }
  if (status === "disabled") {
    return <IconCircleXFilled aria-label={label} size={size} style={style} color={mantineTheme.colors.red[6]} />;
  }
  return <IconCircleXFilled aria-label={label} size={size} style={style} color={mantineTheme.colors.gray[6]} />;
};
