"use client";

import { useState } from "react";
import { Box, Select, Stack, Tabs } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import { ClusterHealthMonitoring } from "./cluster/cluster-health";
import { partitionHealthMonitoringIntegrations } from "./integration-selection";
import { SystemHealthMonitoring } from "./system-health";
import { useHealthPreferences } from "./use-health-preferences";
import { useHealthBounds } from "./use-health-bounds";
import classes from "./health-monitoring.module.css";

type Props = WidgetComponentProps<"healthMonitoring">;

export default function HealthMonitoringWidget(props: Props) {
  const bounds = useHealthBounds(props.displayScale);
  let scale = props.displayScale ?? 1;
  if (props.displayMode === "advanced" || !Number.isFinite(scale) || scale <= 0) scale = 1;
  return (
    <Box ref={bounds.ref} h="100%" mih={0} miw={0} className={classes.root} style={{ overflow: "hidden" }}>
      <HealthMonitoringContent
        {...props}
        width={bounds.width || props.width * scale}
        height={bounds.height || props.height * scale}
        displayScale={1}
      />
    </Box>
  );
}

function HealthMonitoringContent(props: Props) {
  const integrationsQuery = clientApi.integration.byIds.useQuery(props.integrationIds);
  const t = useI18n("widget.healthMonitoring");
  const onPreferences = useHealthPreferences(props);
  if (isInitialWidgetQueryPending(integrationsQuery)) return <WidgetQueryLoadingState />;
  const byId = new Map(
    (getUsableWidgetQueryData(integrationsQuery) ?? []).map((integration) => [integration.id, integration]),
  );
  const integrations = props.integrationIds.flatMap((id) => {
    const integration = byId.get(id);
    if (integration) return [integration];
    return [];
  });
  const { clusterIntegrationIds, systemIntegrationIds } = partitionHealthMonitoringIntegrations(integrations);
  const system = <BoundedSystems {...props} integrations={integrations} integrationIds={systemIntegrationIds} />;
  const clusters = <ClusterPanels {...props} integrationIds={clusterIntegrationIds} />;
  if (clusterIntegrationIds.length === 0) return system;
  if (systemIntegrationIds.length === 0) return clusters;
  const tabs: ("system" | "cluster")[] = ["system", "cluster"];
  if (props.options.tabOrder === "cluster-first") tabs.reverse();
  return (
    <Tabs
      value={props.options.defaultTab}
      onChange={(value) => {
        if (value === "system" || value === "cluster") onPreferences({ defaultTab: value });
      }}
      h="100%"
      style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <Tabs.List grow style={{ flexShrink: 0 }}>
        {tabs.map((tab) => (
          <Tabs.Tab key={tab} value={tab} fz="xs" disabled={props.isEditMode}>
            {t(("tab." + tab) as "tab.system")}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <Tabs.Panel value="system" style={{ flex: 1, minHeight: 0 }}>
        {system}
      </Tabs.Panel>
      <Tabs.Panel value="cluster" style={{ flex: 1, minHeight: 0 }}>
        {clusters}
      </Tabs.Panel>
    </Tabs>
  );
}

function BoundedSystems(props: Props & { integrations: RouterOutputs["integration"]["byIds"] }) {
  const bounds = useHealthBounds();
  return (
    <Box ref={bounds.ref} h="100%" mih={0} miw={0}>
      <SystemHealthMonitoring
        {...props}
        width={bounds.width || props.width}
        height={bounds.height || props.height}
        displayScale={1}
      />
    </Box>
  );
}

function ClusterPanels(props: Props) {
  const [selected, setSelected] = useState("");
  const t = useI18n("widget.healthMonitoring.rework");
  const bounds = useHealthBounds();
  const id = props.integrationIds.find((entry) => entry === selected) ?? props.integrationIds[0];
  if (!id) return null;
  return (
    <Stack h="100%" gap={0} miw={0} mih={0}>
      {props.integrationIds.length > 1 && (
        <Select
          size="xs"
          mx="sm"
          mt="xs"
          value={id}
          aria-label={t("clusterResources")}
          data={props.integrationIds.map((integrationId, index) => ({
            value: integrationId,
            label: "Proxmox " + (index + 1),
          }))}
          onChange={(value) => {
            if (value) setSelected(value);
          }}
          allowDeselect={false}
          disabled={props.isEditMode}
        />
      )}
      <Box ref={bounds.ref} flex={1} mih={0} miw={0}>
        <ClusterHealthMonitoring
          {...props}
          integrationId={id}
          width={bounds.width || props.width}
          height={bounds.height || props.height}
          displayScale={1}
        />
      </Box>
    </Stack>
  );
}
