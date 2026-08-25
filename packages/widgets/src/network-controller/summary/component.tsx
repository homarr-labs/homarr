"use client";

import type { CSSProperties } from "react";
import { Badge, Card, Center, Group, List, ScrollArea, SimpleGrid, Stack, Text, useMantineTheme } from "@mantine/core";
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

  const isDense = height < 160;
  const showDetails = height >= 180 && width >= 240;
  const columns = width >= 720 ? 2 : 1;
  const isAdvanced = displayMode === "advanced";
  const queryIndicators = (
    <Group gap={0} justify="flex-end">
      <IntegrationErrorIndicator results={results} />
    </Group>
  );

  if (isPending || summaries.length === 0) {
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

  if (isAdvanced) {
    const controllerColumns = width >= 960 ? 2 : 1;
    const matrixColumns = width >= 720 ? 3 : width >= 440 ? 2 : 1;

    return (
      <ScrollArea h="100%" p="sm" pos="relative">
        {queryIndicators}
        <SimpleGrid cols={controllerColumns} spacing="sm">
          {summaries.map(({ integration, summary, updatedAt }) => (
            <Card
              key={integration.id}
              p="sm"
              withBorder
              bg="transparent"
              style={{ borderColor: neutralSurfaceBorder }}
            >
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
                              size="var(--mantine-font-size-md)"
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
    <Stack h="100%" p={isDense ? "xs" : "sm"} gap={0} style={{ overflow: "hidden" }}>
      {queryIndicators}
      <SimpleGrid cols={columns} spacing="sm" style={{ flex: 1, minHeight: 0, alignContent: "center" }}>
        {summaries.map(({ integration, summary }) => (
          <Card
            key={integration.id}
            p={isDense ? "xs" : "sm"}
            withBorder={summaries.length > 1}
            bg="transparent"
            style={{ borderColor: neutralSurfaceBorder }}
          >
            <Stack h="100%" gap={isDense ? 4 : 8} justify="center" align="center">
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
              <List spacing={isDense ? 2 : 4} center size={isDense ? "xs" : "sm"} w="fit-content" mx="auto">
                <List.Item
                  icon={
                    <StatusIcon
                      status={summary.wanStatus}
                      label={statusLabels[getBinaryStatusKey(summary.wanStatus)]}
                      style={isDense ? iconSizes.md : iconSizes.xl}
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
                      style={isDense ? iconSizes.md : iconSizes.xl}
                    />
                  }
                >
                  <Text>
                    {t("card.web")}
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
                      style={isDense ? iconSizes.md : iconSizes.xl}
                    />
                  }
                >
                  {t("card.wifi")}
                  {showDetails ? ` · ${summary.wifi.users + summary.wifi.guests}` : ""}
                </List.Item>
                {showDetails && (
                  <List.Item
                    icon={
                      <StatusIcon
                        status={summary.lan.status}
                        label={statusLabels[getBinaryStatusKey(summary.lan.status)]}
                        style={isDense ? iconSizes.md : iconSizes.xl}
                      />
                    }
                  >
                    {t("card.lan")} · {summary.lan.users + summary.lan.guests}
                  </List.Item>
                )}
                <List.Item
                  icon={
                    <StatusIcon
                      status={summary.vpn.status}
                      label={statusLabels[getBinaryStatusKey(summary.vpn.status)]}
                      style={isDense ? iconSizes.md : iconSizes.xl}
                    />
                  }
                >
                  <Text>
                    {t("card.vpn.label")}
                    <Text c="dimmed" size="sm" ms="xs" span>
                      {t("card.vpn.countConnected", { count: summary.vpn.users })}
                    </Text>
                  </Text>
                </List.Item>
              </List>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
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

const neutralSurfaceBorder =
  "rgb(from var(--mantine-color-default-border) r g b / calc(var(--opacity, 1) * 0.45))";

const StatusIcon = ({
  status,
  label,
  size,
  style,
}: {
  status?: "enabled" | "disabled";
  label: string;
  size?: number | string;
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
