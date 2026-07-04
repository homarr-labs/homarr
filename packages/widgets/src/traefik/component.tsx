"use client";

import type { ReactNode } from "react";
import { Badge, Group, ScrollArea, Text } from "@mantine/core";
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
import type { WidgetComponentProps } from "../definition";
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
  http: emptyProtocol,
  tcp: emptyProtocol,
  udp: {
    routers: emptySummary,
    services: emptySummary,
  },
};

type ProtocolKey = "http" | "tcp" | "udp";
type ResourceKey = "routers" | "services" | "middlewares";

export default function TraefikWidget({ integrationIds, options, width }: WidgetComponentProps<"traefik">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  const t = useScopedI18n("widget.traefik");
  const { data } = clientApi.widget.traefik.getDashboard.useQuery({ integrationIds });

  if (!data) return <WidgetEmptyState />;

  const combined = data.reduce<TraefikDashboardData>(
    (acc, item) => ({
      version: acc.version ?? item.dashboard.version,
      entryPoints: [...acc.entryPoints, ...item.dashboard.entryPoints],
      http: combineProtocol(acc.http, item.dashboard.http),
      tcp: combineProtocol(acc.tcp, item.dashboard.tcp),
      udp: {
        routers: combineSummary(acc.udp.routers, item.dashboard.udp.routers),
        services: combineSummary(acc.udp.services, item.dashboard.udp.services),
      },
    }),
    emptyDashboard,
  );

  const totalRouters = combined.http.routers.total + combined.tcp.routers.total + combined.udp.routers.total;
  const totalErrors = getProtocolErrors(combined.http) + getProtocolErrors(combined.tcp) + getUdpErrors(combined.udp);
  const totalWarnings =
    getProtocolWarnings(combined.http) + getProtocolWarnings(combined.tcp) + getUdpWarnings(combined.udp);
  const protocolKeys: ProtocolKey[] = ["http"];
  if (options.showTcp) protocolKeys.push("tcp");
  if (options.showUdp) protocolKeys.push("udp");

  return (
    <ScrollArea h="100%">
      <div className={classes.root}>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <div className={classes.titleBlock}>
            <Text className={classes.title}>{data.length === 1 ? data[0]?.integrationName : t("instances")}</Text>
            <Text className={classes.subtitle}>{combined.version ? `v${combined.version}` : t("versionUnknown")}</Text>
          </div>
          <HealthBadge errors={totalErrors} warnings={totalWarnings} />
        </Group>

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

        {options.showEntryPoints && combined.entryPoints.length > 0 && (
          <div className={classes.entryPoints}>
            {dedupe(combined.entryPoints)
              .slice(0, getEntryPointLimit(width))
              .map((entryPoint) => (
                <Badge key={entryPoint} variant="light" size="sm" radius="sm">
                  {entryPoint}
                </Badge>
              ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

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
      <Text className={classes.protocolTitle}>{t(`protocol.${protocol}`)}</Text>
      <div className={classes.protocolRows}>
        {rows.map(({ key, icon: Icon, summary }) => (
          <div key={key} className={classes.protocolRow}>
            <Group gap={4} wrap="nowrap" className={classes.protocolLabel}>
              <Icon size={14} />
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
      <Badge color="red" variant="light" leftSection={<IconAlertTriangle size={12} />} radius="sm">
        {t("status.errors", { count: errors })}
      </Badge>
    );
  }

  if (warnings > 0) {
    return (
      <Badge color="yellow" variant="light" leftSection={<IconAlertTriangle size={12} />} radius="sm">
        {t("status.warnings", { count: warnings })}
      </Badge>
    );
  }

  return (
    <Badge color="green" variant="light" leftSection={<IconCircleCheck size={12} />} radius="sm">
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
