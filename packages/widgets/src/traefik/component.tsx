"use client";

import type { ReactNode } from "react";
import { Badge, Box, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconDoorEnter,
  IconRoute,
  IconServer,
  IconStack2,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { TraefikDashboardData, TraefikProtocolSummary, TraefikResourceSummary } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import classes from "./component.module.css";

const emptySummary: TraefikResourceSummary = {
  total: 0,
  enabled: 0,
  warnings: 0,
  errors: 0,
};

const emptyProtocol: TraefikProtocolSummary = {
  routers: emptySummary,
  services: emptySummary,
  middlewares: emptySummary,
};

const emptyDashboard: TraefikDashboardData = {
  version: null,
  entryPoints: [],
  resources: [],
  failedEndpoints: [],
  http: emptyProtocol,
  tcp: emptyProtocol,
  udp: {
    routers: emptySummary,
    services: emptySummary,
  },
};

type ProtocolKey = "http" | "tcp" | "udp";
type ResourceKey = "routers" | "services" | "middlewares";

interface TraefikDashboardSource {
  integrationId: string;
  integrationName: string;
  dashboard: TraefikDashboardData;
}

export const getTraefikSourceDetails = (sources: readonly TraefikDashboardSource[]) => ({
  resources: sources.flatMap(({ integrationId, integrationName, dashboard }) =>
    dashboard.resources.map((resource, index) => ({
      ...resource,
      integrationId,
      integrationName,
      key: `${integrationId}:${resource.protocol}:${resource.type}:${resource.name}:${index}`,
    })),
  ),
  failedEndpoints: sources.flatMap(({ integrationId, integrationName, dashboard }) =>
    dashboard.failedEndpoints.map((endpoint, index) => ({
      endpoint,
      integrationId,
      integrationName,
      key: `${integrationId}:${endpoint}:${index}`,
    })),
  ),
});

export function getTraefikProtocolKeys(
  options: Pick<WidgetComponentProps<"traefik">["options"], "showTcp" | "showUdp">,
  height: number,
  isAdvanced: boolean,
): ProtocolKey[] {
  const protocols: ProtocolKey[] = ["http"];
  if (isAdvanced || (options.showTcp && height >= 220)) protocols.push("tcp");
  if (isAdvanced || (options.showUdp && height >= 300)) protocols.push("udp");
  return protocols;
}

export function getVisibleTraefikEntryPoints(values: string[], width: number, isAdvanced: boolean): string[] {
  const entryPoints = dedupe(values);
  return isAdvanced ? entryPoints : entryPoints.slice(0, getEntryPointLimit(width));
}

export default function TraefikWidget(props: WidgetComponentProps<"traefik">) {
  if (props.integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  return <TraefikWidgetContent {...props} />;
}

function TraefikWidgetContent({
  integrationIds,
  options,
  width,
  height,
  displayMode = "compact",
}: WidgetComponentProps<"traefik">) {
  const t = useScopedI18n("widget.traefik");
  const dashboardQuery = clientApi.widget.traefik.getDashboard.useQuery({ integrationIds });
  const data = getUsableWidgetQueryData(dashboardQuery);

  if (!data) return <WidgetEmptyState />;
  const successfulData = data.flatMap((item) =>
    item.dashboard === null ? [] : [{ ...item, dashboard: item.dashboard }],
  );

  const combined = successfulData.reduce<TraefikDashboardData>(
    (acc, item) => ({
      version: acc.version ?? item.dashboard.version,
      entryPoints: [...acc.entryPoints, ...item.dashboard.entryPoints],
      resources: [...acc.resources, ...item.dashboard.resources],
      failedEndpoints: [...acc.failedEndpoints, ...item.dashboard.failedEndpoints],
      http: combineProtocol(acc.http, item.dashboard.http),
      tcp: combineProtocol(acc.tcp, item.dashboard.tcp),
      udp: {
        routers: combineSummary(acc.udp.routers, item.dashboard.udp.routers),
        services: combineSummary(acc.udp.services, item.dashboard.udp.services),
      },
    }),
    emptyDashboard,
  );

  const isAdvanced = displayMode === "advanced";
  const totalRouters = combined.http.routers.total + combined.tcp.routers.total + combined.udp.routers.total;
  const totalErrors =
    getProtocolErrors(combined.http) +
    getProtocolErrors(combined.tcp) +
    getUdpErrors(combined.udp) +
    combined.failedEndpoints.length;
  const totalWarnings =
    getProtocolWarnings(combined.http) + getProtocolWarnings(combined.tcp) + getUdpWarnings(combined.udp);
  const protocolKeys = getTraefikProtocolKeys(options, height, isAdvanced);
  const entryPoints = getVisibleTraefikEntryPoints(combined.entryPoints, width, isAdvanced);
  const displayedVersion = successfulData.length === 1 ? successfulData[0]?.dashboard.version : null;

  const summary = (
    <div className={classes.root}>
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <div className={classes.titleBlock}>
          <Text className={classes.title}>
            {successfulData.length === 1 ? successfulData[0]?.integrationName : t("instances")}
          </Text>
          <Text className={classes.subtitle}>
            {displayedVersion
              ? `v${displayedVersion}`
              : successfulData.length > 1
                ? successfulData.map(({ integrationName }) => integrationName).join(" · ")
                : t("versionUnknown")}
          </Text>
        </div>
        <HealthBadge errors={totalErrors} warnings={totalWarnings} />
      </Group>

      {isAdvanced && (
        <Group gap={4} wrap="wrap">
          {successfulData.map(({ integrationId, integrationName, dashboard }) => (
            <Badge key={integrationId} variant="outline" size="sm" radius="sm">
              {integrationName} · {dashboard.version ? `v${dashboard.version}` : t("versionUnknown")}
            </Badge>
          ))}
        </Group>
      )}

      <div className={classes.hero}>
        <SummaryMetric
          icon={<IconRoute size={getHeroIconSize(width)} />}
          label={t("summary.routers")}
          value={totalRouters}
        />
        <SummaryMetric
          icon={<IconDoorEnter size={getHeroIconSize(width)} />}
          label={t("summary.entryPoints")}
          value={dedupe(combined.entryPoints).length}
        />
      </div>

      <div className={classes.protocolGrid}>
        {protocolKeys.map((protocol) => (
          <ProtocolCard key={protocol} protocol={protocol} data={combined[protocol]} />
        ))}
      </div>

      {(isAdvanced || options.showEntryPoints) && entryPoints.length > 0 && (isAdvanced || height >= 340) && (
        <div className={classes.entryPoints}>
          {entryPoints.map((entryPoint) => (
            <Badge key={entryPoint} variant="light" size="sm" radius="sm">
              {entryPoint}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  if (!isAdvanced) {
    return (
      <Box h="100%" pos="relative">
        <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
          <IntegrationErrorIndicator results={data} />
          <WidgetQueryErrorIndicator error={dashboardQuery.error} label={t("name")} />
        </Group>
        <ScrollArea h="100%">{summary}</ScrollArea>
      </Box>
    );
  }

  const sourceDetails = getTraefikSourceDetails(successfulData);
  const resources = sourceDetails.resources.toSorted(
    (left, right) =>
      resourceStatusOrder[left.status] - resourceStatusOrder[right.status] || left.name.localeCompare(right.name),
  );
  const resourceList = (
    <Stack gap="xs">
      {sourceDetails.failedEndpoints.map(({ endpoint, integrationName, key }) => (
        <Badge key={key} color="red" variant="light">
          {integrationName} · {t("failedEndpoint", { endpoint })}
        </Badge>
      ))}
      {resources.map((resource) => (
        <Group key={resource.key} justify="space-between" wrap="nowrap" p="xs">
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text size="sm" fw={600} truncate>
              {resource.name}
            </Text>
            <Text size="xs" c="dimmed">
              {resource.protocol.toUpperCase()} · {t(`resourceType.${resource.type}`)} · {resource.provider ?? "—"} ·{" "}
              {resource.integrationName}
            </Text>
          </Stack>
          <Badge
            color={
              resource.status === "error"
                ? "red"
                : resource.status === "warning"
                  ? "yellow"
                  : resource.status === "enabled"
                    ? "green"
                    : "gray"
            }
          >
            {t(`resourceStatus.${resource.status}`)}
          </Badge>
        </Group>
      ))}
    </Stack>
  );

  if (width < 900) {
    return (
      <Box h="100%" pos="relative">
        <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
          <IntegrationErrorIndicator results={data} />
          <WidgetQueryErrorIndicator error={dashboardQuery.error} label={t("name")} />
        </Group>
        <ScrollArea h="100%">
          <Stack gap="md" p="md">
            {summary}
            {resourceList}
          </Stack>
        </ScrollArea>
      </Box>
    );
  }

  return (
    <Box h="100%" pos="relative">
      <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
        <IntegrationErrorIndicator results={data} />
        <WidgetQueryErrorIndicator error={dashboardQuery.error} label={t("name")} />
      </Group>
      <SimpleGrid cols={2} spacing="md" h="100%" p="md" style={{ gridTemplateRows: "minmax(0, 1fr)" }}>
        <ScrollArea h="100%">{summary}</ScrollArea>
        <ScrollArea h="100%">{resourceList}</ScrollArea>
      </SimpleGrid>
    </Box>
  );
}

const resourceStatusOrder = { error: 0, warning: 1, disabled: 2, unknown: 3, enabled: 4 } as const;

function ProtocolCard({ protocol, data }: { protocol: ProtocolKey; data: TraefikDashboardData[ProtocolKey] }) {
  const t = useScopedI18n("widget.traefik");
  const rows: { key: ResourceKey; icon: typeof IconRoute; summary: TraefikResourceSummary }[] = [
    { key: "routers", icon: IconRoute, summary: data.routers },
    { key: "services", icon: IconServer, summary: data.services },
  ];
  if ("middlewares" in data) {
    rows.push({ key: "middlewares", icon: IconStack2, summary: data.middlewares });
  }

  return (
    <div className={classes.protocolCard}>
      <Text className={classes.protocolTitle}>{protocol.toUpperCase()}</Text>
      <div className={classes.protocolRows}>
        {rows.map(({ key, icon: Icon, summary }) => (
          <div key={key} className={classes.protocolRow}>
            <Group gap={4} wrap="nowrap" className={classes.protocolLabel}>
              <Icon size="var(--mantine-font-size-sm)" />
              <Text>{t(`resource.${key}`)}</Text>
            </Group>
            <StatusCount summary={summary} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusCount({ summary }: { summary: TraefikResourceSummary }) {
  return (
    <Group gap={4} wrap="nowrap" className={classes.counts}>
      <Text fw={700}>{summary.total}</Text>
      {summary.errors > 0 && (
        <Text c="red" fw={700}>
          {summary.errors}
        </Text>
      )}
      {summary.warnings > 0 && (
        <Text c="yellow" fw={700}>
          {summary.warnings}
        </Text>
      )}
    </Group>
  );
}

function SummaryMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className={classes.metric}>
      <div className={classes.metricIcon}>{icon}</div>
      <div className={classes.metricText}>
        <Text className={classes.metricValue}>{value}</Text>
        <Text className={classes.metricLabel}>{label}</Text>
      </div>
    </div>
  );
}

function HealthBadge({ errors, warnings }: { errors: number; warnings: number }) {
  const t = useScopedI18n("widget.traefik");

  if (errors > 0) {
    return (
      <Badge color="red" variant="light" leftSection={<IconAlertTriangle size="var(--mantine-font-size-xs)" />} radius="sm">
        {t("status.errors", { count: errors })}
      </Badge>
    );
  }

  if (warnings > 0) {
    return (
      <Badge color="yellow" variant="light" leftSection={<IconAlertTriangle size="var(--mantine-font-size-xs)" />} radius="sm">
        {t("status.warnings", { count: warnings })}
      </Badge>
    );
  }

  return (
    <Badge color="green" variant="light" leftSection={<IconCircleCheck size="var(--mantine-font-size-xs)" />} radius="sm">
      {t("status.healthy")}
    </Badge>
  );
}

function combineProtocol(left: TraefikProtocolSummary, right: TraefikProtocolSummary): TraefikProtocolSummary {
  return {
    routers: combineSummary(left.routers, right.routers),
    services: combineSummary(left.services, right.services),
    middlewares: combineSummary(left.middlewares, right.middlewares),
  };
}

function combineSummary(left: TraefikResourceSummary, right: TraefikResourceSummary): TraefikResourceSummary {
  return {
    total: left.total + right.total,
    enabled: left.enabled + right.enabled,
    warnings: left.warnings + right.warnings,
    errors: left.errors + right.errors,
  };
}

function getProtocolErrors(protocol: TraefikProtocolSummary) {
  return protocol.routers.errors + protocol.services.errors + protocol.middlewares.errors;
}

function getProtocolWarnings(protocol: TraefikProtocolSummary) {
  return protocol.routers.warnings + protocol.services.warnings + protocol.middlewares.warnings;
}

function getUdpErrors(protocol: TraefikDashboardData["udp"]) {
  return protocol.routers.errors + protocol.services.errors;
}

function getUdpWarnings(protocol: TraefikDashboardData["udp"]) {
  return protocol.routers.warnings + protocol.services.warnings;
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

function getHeroIconSize(width: number) {
  if (width < 220) return 16;
  if (width < 340) return 18;
  return 22;
}

function getEntryPointLimit(width: number) {
  if (width < 220) return 2;
  if (width < 360) return 4;
  return 8;
}
