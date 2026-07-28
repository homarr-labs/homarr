"use client";

import { ScrollArea, Tabs } from "@mantine/core";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { clientApi } from "@homarr/api/client";
import type { IntegrationKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { WidgetMobileLoading, WidgetMobileSummary } from "../common/mobile-summary";
import type { WidgetComponentProps } from "../definition";
import { ClusterHealthMonitoring } from "./cluster/cluster-health";
import { SystemHealthMonitoring } from "./system-health";

dayjs.extend(duration);

const isClusterIntegration = (integration: { kind: IntegrationKind }) =>
  integration.kind === "proxmox" || integration.kind === "mock";

export default function HealthMonitoringWidget(props: WidgetComponentProps<"healthMonitoring">) {
  const { data: integrations = [], error, isPending } = clientApi.integration.byIds.useQuery(props.integrationIds);
  const t = useI18n();

  if (props.displayMode === "mobileSummary" && isPending) return <WidgetMobileLoading />;
  if (props.displayMode === "mobileSummary" && error && integrations.length === 0) throw error;

  const clusterIntegrationId = integrations.find(isClusterIntegration)?.id;

  if (props.displayMode === "mobileSummary") {
    return clusterIntegrationId ? (
      <ClusterHealthMobileSummary integrationId={clusterIntegrationId} isStale={Boolean(error)} />
    ) : (
      <SystemHealthMobileSummary integrationIds={props.integrationIds} isStale={Boolean(error)} />
    );
  }

  if (!clusterIntegrationId) {
    return <SystemHealthMonitoring {...props} />;
  }

  const otherIntegrationIds = integrations
    // We want to have the mock integration also in the system tab, so we use it for both
    .filter((integration) => integration.kind !== "proxmox")
    .map((integration) => integration.id);
  if (otherIntegrationIds.length === 0) {
    return <ClusterHealthMonitoring {...props} integrationId={clusterIntegrationId} />;
  }

  const tabs = (
    <Tabs defaultValue={props.options.defaultTab} variant="outline">
      <Tabs.List grow>
        <Tabs.Tab value="system" fz="xs">
          <b>{t("widget.healthMonitoring.tab.system")}</b>
        </Tabs.Tab>
        <Tabs.Tab value="cluster" fz="xs">
          <b>{t("widget.healthMonitoring.tab.cluster")}</b>
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="system">
        <SystemHealthMonitoring {...props} integrationIds={otherIntegrationIds} />
      </Tabs.Panel>
      <Tabs.Panel value="cluster">
        <ClusterHealthMonitoring integrationId={clusterIntegrationId} {...props} />
      </Tabs.Panel>
    </Tabs>
  );

  if (props.displayMode === "mobileDetail") return tabs;

  return <ScrollArea h="100%">{tabs}</ScrollArea>;
}

const SystemHealthMobileSummary = ({ integrationIds, isStale }: { integrationIds: string[]; isStale: boolean }) => {
  const t = useI18n();
  const { data, error, isPending } = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery({
    integrationIds,
  });

  if (isPending) return <WidgetMobileLoading />;
  if (error && !data) throw error;

  const healthInfo = data?.[0]?.healthInfo;
  if (!healthInfo) return <WidgetMobileSummary value="—" label={t("widget.healthMonitoring.name")} />;

  const totalMemory = healthInfo.memAvailableInBytes + healthInfo.memUsedInBytes;
  const memoryPercent = totalMemory > 0 ? Math.round((healthInfo.memUsedInBytes / totalMemory) * 100) : 0;

  return (
    <WidgetMobileSummary
      value={`${Math.round(healthInfo.cpuUtilization)}%`}
      label={t("widget.healthMonitoring.cluster.summary.cpu")}
      description={`${t("widget.healthMonitoring.cluster.summary.memory")} ${memoryPercent}%`}
      isStale={isStale || Boolean(error) || (data?.length ?? 0) < integrationIds.length}
    />
  );
};

const ClusterHealthMobileSummary = ({ integrationId, isStale }: { integrationId: string; isStale: boolean }) => {
  const t = useI18n();
  const { data, error, isPending } = clientApi.widget.healthMonitoring.getClusterHealthStatus.useQuery({
    integrationId,
  });

  if (isPending) return <WidgetMobileLoading />;
  if (error && !data) throw error;
  if (!data) return <WidgetMobileSummary value="—" label={t("widget.healthMonitoring.name")} />;

  const runningNodes = data.nodes.filter((node) => node.isRunning);
  const totalCpu = runningNodes.reduce((sum, node) => sum + node.cpu.cores, 0);
  const usedCpu = runningNodes.reduce((sum, node) => sum + node.cpu.utilization * node.cpu.cores, 0);
  const totalMemory = runningNodes.reduce((sum, node) => sum + node.memory.total, 0);
  const usedMemory = runningNodes.reduce((sum, node) => sum + node.memory.used, 0);
  const cpuPercent = totalCpu > 0 ? Math.round((usedCpu / totalCpu) * 100) : 0;
  const memoryPercent = totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0;

  return (
    <WidgetMobileSummary
      value={`${cpuPercent}%`}
      label={t("widget.healthMonitoring.cluster.summary.cpu")}
      description={`${t("widget.healthMonitoring.cluster.summary.memory")} ${memoryPercent}%`}
      isStale={isStale || Boolean(error)}
    />
  );
};
