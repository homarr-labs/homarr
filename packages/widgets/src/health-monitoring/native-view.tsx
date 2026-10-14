"use client";

import { Box, ScrollArea, SimpleGrid, Stack, Tabs } from "@mantine/core";
import type { ReactNode } from "react";

import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
export interface NativeHealthMonitoringViewProps {
  options: WidgetComponentProps<"healthMonitoring">["options"];
  displayMode: WidgetComponentProps<"healthMonitoring">["displayMode"];
  width: number;
  clusterIntegrationIds: string[];
  systemIntegrationIds: string[];
  renderSystem: (withScrollArea: boolean) => ReactNode;
  renderCluster: (integrationId: string, keyed: boolean) => ReactNode;
}

export function NativeHealthMonitoringView(props: NativeHealthMonitoringViewProps) {
  const t = useI18n("widget.healthMonitoring");

  const { clusterIntegrationIds, systemIntegrationIds, renderSystem, renderCluster } = props;

  if (clusterIntegrationIds.length === 0) {
    return renderSystem(true);
  }

  const clusters = (
    <Stack gap="sm">{clusterIntegrationIds.map((integrationId) => renderCluster(integrationId, true))}</Stack>
  );

  if (systemIntegrationIds.length === 0) {
    const onlyClusterIntegrationId = clusterIntegrationIds[0];
    if (clusterIntegrationIds.length === 1 && onlyClusterIntegrationId) {
      return renderCluster(onlyClusterIntegrationId, false);
    }
    return <ScrollArea h="100%">{clusters}</ScrollArea>;
  }

  if (props.displayMode === "advanced") {
    if (props.width < 900) {
      return (
        <ScrollArea h="100%">
          <Stack gap="sm" p="xs">
            {renderSystem(false)}
            {clusters}
          </Stack>
        </ScrollArea>
      );
    }

    return (
      <SimpleGrid cols={2} spacing="sm" p="xs" h="100%" style={{ gridTemplateRows: "minmax(0, 1fr)" }}>
        <Box style={{ minHeight: 0, overflow: "hidden" }}>{renderSystem(true)}</Box>
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
        <Tabs.Panel value="system">{renderSystem(true)}</Tabs.Panel>
        <Tabs.Panel value="cluster">{clusters}</Tabs.Panel>
      </Tabs>
    </ScrollArea>
  );
}
