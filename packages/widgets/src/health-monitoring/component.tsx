"use client";

import { Box, ScrollArea, SimpleGrid, Stack, Tabs } from "@mantine/core";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { ClusterHealthMonitoring } from "./cluster/cluster-health";
import { partitionHealthMonitoringIntegrations } from "./integration-selection";
import { SystemHealthMonitoring } from "./system-health";

dayjs.extend(duration);

export default function HealthMonitoringWidget(props: WidgetComponentProps<"healthMonitoring">) {
  const integrations = getUsableWidgetQueryData(clientApi.integration.byIds.useQuery(props.integrationIds)) ?? [];
  const t = useI18n("widget.healthMonitoring");

  const { clusterIntegrationIds, systemIntegrationIds } = partitionHealthMonitoringIntegrations(integrations);

  if (clusterIntegrationIds.length === 0) {
    return <SystemHealthMonitoring {...props} />;
  }

  const clusters = (
    <Stack gap="sm">
      {clusterIntegrationIds.map((integrationId) => (
        <ClusterHealthMonitoring key={integrationId} {...props} integrationId={integrationId} />
      ))}
    </Stack>
  );

  if (systemIntegrationIds.length === 0) {
    const onlyClusterIntegrationId = clusterIntegrationIds[0];
    if (clusterIntegrationIds.length === 1 && onlyClusterIntegrationId) {
      return <ClusterHealthMonitoring {...props} integrationId={onlyClusterIntegrationId} />;
    }
    return <ScrollArea h="100%">{clusters}</ScrollArea>;
  }

  if (props.displayMode === "advanced") {
    if (props.width < 900) {
      return (
        <ScrollArea h="100%">
          <Stack gap="sm" p="xs">
            <SystemHealthMonitoring {...props} integrationIds={systemIntegrationIds} withScrollArea={false} />
            {clusters}
          </Stack>
        </ScrollArea>
      );
    }

    return (
      <SimpleGrid cols={2} spacing="sm" p="xs" h="100%" style={{ gridTemplateRows: "minmax(0, 1fr)" }}>
        <Box style={{ minHeight: 0, overflow: "hidden" }}>
          <SystemHealthMonitoring {...props} integrationIds={systemIntegrationIds} />
        </Box>
        <ScrollArea h="100%">{clusters}</ScrollArea>
      </SimpleGrid>
    );
  }

  return (
    <ScrollArea h="100%">
      <Tabs defaultValue={props.options.defaultTab} variant="outline">
        <Tabs.List grow>
          <Tabs.Tab value="system" fz="xs">
            <b>{t("tab.system")}</b>
          </Tabs.Tab>
          <Tabs.Tab value="cluster" fz="xs">
            <b>{t("tab.cluster")}</b>
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="system">
          <SystemHealthMonitoring {...props} integrationIds={systemIntegrationIds} />
        </Tabs.Panel>
        <Tabs.Panel value="cluster">{clusters}</Tabs.Panel>
      </Tabs>
    </ScrollArea>
  );
}
