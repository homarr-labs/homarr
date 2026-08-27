"use client";

import type { CSSProperties } from "react";
import { Box, Card, Center, Group, List, ScrollArea, SimpleGrid, Stack, Text, useMantineTheme } from "@mantine/core";
import { IconCircleCheckFilled, IconCircleXFilled } from "@tabler/icons-react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import objectSupport from "dayjs/plugin/objectSupport";
import relativeTime from "dayjs/plugin/relativeTime";

import { clientApi } from "@homarr/api/client";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import type { WidgetComponentProps } from "../../definition";
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import { getBinaryStatusKey } from "../../common/locale";
import { getUsableWidgetQueryData } from "../../common/query-state";
import type { NetworkControllerMatrixMetricKey, NetworkControllerMatrixSectionKey } from "./display";
import { getNetworkControllerMatrix } from "./display";

dayjs.extend(objectSupport);
dayjs.extend(relativeTime);
dayjs.extend(duration);

export default function NetworkControllerSummaryWidget({
  integrationIds,
  width,
  displayMode,
}: WidgetComponentProps<"networkControllerSummary">) {
  const summaryQuery = clientApi.widget.networkController.summary.useQuery({
    integrationIds,
  });
  const isAdvanced = displayMode === "advanced";
  let results = summaryQuery.data ?? [];
  if (isAdvanced) {
    results = getUsableWidgetQueryData(summaryQuery) ?? [];
  }
  const summaries = results.filter(
    (result): result is typeof result & { summary: NonNullable<typeof result.summary>; updatedAt: Date } =>
      result.summary !== null && result.updatedAt !== undefined,
  );
  const { isPending } = summaryQuery;

  const t = useI18n("widget.networkControllerSummary");
  const tDns = useI18n("widget.dnsHoleSummary");
  const tCommon = useI18n("common");
  const tWidgetCommon = useI18n("widget.common");
  const locale = useCurrentIntlLocale();
  const statusLabels = {
    enabled: tDns("status.enabled"),
    disabled: tDns("status.disabled"),
    unknown: tDns("status.unknown"),
  };

  const indicatorResults =
    results.length > 0 || !summaryQuery.error
      ? results
      : integrationIds.map((integrationId) => ({ integrationId, error: "query" }));
  const queryIndicators = (
    <Group gap={0} justify="flex-end">
      <IntegrationErrorIndicator results={indicatorResults} />
    </Group>
  );
  const firstSummary = summaries[0];

  if (isPending || !firstSummary) {
    return (
      <Stack h="100%" gap={0}>
        {queryIndicators}
        <Center p="sm" style={{ flex: 1 }}>
          <Text c="dimmed" size="sm" ta="center">
            {isPending ? tCommon("action.loading") : tWidgetCommon("integrationDisconnected")}
          </Text>
        </Center>
      </Stack>
    );
  }

  if (!isAdvanced) {
    const summary = firstSummary.summary;

    return (
      <Box h="100%" p="sm" pos="relative">
        <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
          {queryIndicators}
        </Box>
        <Center h="100%">
          <List spacing="xs" center>
            <List.Item
              icon={
                <StatusIcon
                  status={summary.wanStatus}
                  label={statusLabels[getBinaryStatusKey(summary.wanStatus)]}
                  style={iconSizes.xl}
                />
              }
            >
              {t("card.wan")}
            </List.Item>
            <List.Item
              icon={
                <StatusIcon
                  status={summary.www.status}
                  label={statusLabels[getBinaryStatusKey(summary.www.status)]}
                  style={iconSizes.xl}
                />
              }
            >
              <Text>
                WWW
                <Text c="dimmed" size="md" ms="xs" span>
                  {summary.www.latency}ms
                </Text>
              </Text>
            </List.Item>
            <List.Item
              icon={
                <StatusIcon
                  status={summary.wifi.status}
                  label={statusLabels[getBinaryStatusKey(summary.wifi.status)]}
                  style={iconSizes.xl}
                />
              }
            >
              {t("card.wifi")}
            </List.Item>
            <List.Item
              icon={
                <StatusIcon
                  status={summary.vpn.status}
                  label={statusLabels[getBinaryStatusKey(summary.vpn.status)]}
                  style={iconSizes.xl}
                />
              }
            >
              <Text>
                {t("card.vpn.label")}
                <Text c="dimmed" size="md" ms="xs" span>
                  {t("card.vpn.countConnected", { count: summary.vpn.users })}
                </Text>
              </Text>
            </List.Item>
          </List>
        </Center>
      </Box>
    );
  }

  const controllerColumns = width >= 960 ? 2 : 1;
  const matrixColumns = width >= 720 ? 3 : width >= 440 ? 2 : 1;

  return (
    <ScrollArea h="100%" p="sm" pos="relative">
      {queryIndicators}
      <SimpleGrid cols={controllerColumns} spacing="sm">
        {summaries.map(({ integration, summary, updatedAt }) => (
          <Card key={integration.id} p="sm" withBorder bg="transparent" style={{ borderColor: neutralSurfaceBorder }}>
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
                    {t("advanced.updated")}
                  </Text>
                  <Text size="xs" c="dimmed" ta="right">
                    {new Date(updatedAt).toLocaleString(locale)}
                  </Text>
                </Stack>
              </Group>
              <SimpleGrid cols={matrixColumns} spacing="xs">
                {getNetworkControllerMatrix(summary).map((section) => (
                  <Card
                    key={section.key}
                    p="xs"
                    withBorder
                    bg="transparent"
                    style={{ borderColor: neutralSurfaceBorder }}
                  >
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

const getMatrixMetricLabel = (
  key: NetworkControllerMatrixMetricKey,
  t: ScopedTranslationFunction<"widget.networkControllerSummary">,
) => t(`advanced.metric.${key}` as never);

const formatMatrixMetric = (key: NetworkControllerMatrixMetricKey, value: number) => {
  if (key === "latency" || key === "ping") return `${value}ms`;
  if (key === "uptime") return dayjs.duration(value, "seconds").humanize();
  return String(value);
};

const getMatrixSectionLabel = (
  key: NetworkControllerMatrixSectionKey,
  t: ScopedTranslationFunction<"widget.networkControllerSummary">,
) => {
  if (key === "vpn") return t("card.vpn.label");
  return t(`card.${key}` as never);
};

const neutralSurfaceBorder = "rgb(from var(--mantine-color-default-border) r g b / calc(var(--opacity, 1) * 0.45))";

const StatusIcon = ({
  status,
  label,
  style,
}: {
  status?: "enabled" | "disabled";
  label: string;
  style?: CSSProperties;
}) => {
  const mantineTheme = useMantineTheme();
  if (status === "enabled") {
    return <IconCircleCheckFilled aria-label={label} style={style} color={mantineTheme.colors.green[6]} />;
  }
  if (status === "disabled") {
    return <IconCircleXFilled aria-label={label} style={style} color={mantineTheme.colors.red[6]} />;
  }
  return <IconCircleXFilled aria-label={label} style={style} color={mantineTheme.colors.gray[6]} />;
};
