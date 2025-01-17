"use client";

import { ScrollArea, Tabs } from "@mantine/core";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { ClusterHealthMonitoring } from "./cluster/cluster-health";
import { SystemHealthMonitoring } from "./system-health";

dayjs.extend(duration);

export default function HealthMonitoringWidget(props: WidgetComponentProps<"healthMonitoring">) {
  const [integrations] = clientApi.integration.byIds.useSuspenseQuery(props.integrationIds);

  const proxmoxIntegrationId = integrations.find((integration) => integration.kind === "proxmox")?.id;

  if (!proxmoxIntegrationId) {
    return <SystemHealthMonitoring {...props} />;
  }

  const otherIntegrationIds = integrations
    .filter((integration) => integration.kind !== "proxmox")
    .map((integration) => integration.id);
  if (otherIntegrationIds.length === 0) {
    return <ClusterHealthMonitoring {...props} integrationId={proxmoxIntegrationId} />;
  }

  return (
    <ScrollArea
      h="100%"
      styles={{
        viewport: {
          '& div[style="min-width: 100%"]': {
            display: "flex !important",
            height: "100%",
          },
        },
      }}
    >
      <Tabs defaultValue={props.options.defaultTab} variant="outline">
        <Tabs.List grow>
          <Tabs.Tab value="system">
            <b>System</b>
          </Tabs.Tab>
          <Tabs.Tab value="cluster">
            <b>Cluster</b>
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel mt="lg" value="system">
          <SystemHealthMonitoring {...props} />
        </Tabs.Panel>
        <Tabs.Panel mt="lg" value="cluster">
          <ClusterHealthMonitoring integrationId={proxmoxIntegrationId} {...props} />
        </Tabs.Panel>
      </Tabs>
    </ScrollArea>
  );
}
