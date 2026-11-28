"use client";

import { useMemo, useState } from "react";
import { ActionIcon, Box, Button, Flex, Group, Select, Stack, Tabs } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconArrowsMaximize } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { isTrpcForbiddenError } from "@homarr/api/query-cache";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import { ClusterHealthMonitoring } from "./cluster/cluster-health";
import { partitionHealthMonitoringIntegrations } from "./integration-selection";
import { SystemHealthMonitoring } from "./system-health";
import type { HealthOptions } from "./display";
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
        key={JSON.stringify([
          props.itemId,
          props.isEditMode,
          props.options.defaultTab,
          props.options.healthFilter,
          props.options.historyWindow,
        ])}
        {...props}
        width={bounds.width || props.width * scale}
        height={bounds.height || props.height * scale}
        displayScale={1}
      />
    </Box>
  );
}

function HealthMonitoringContent(props: Props) {
  const [overrides, setOverrides] = useState<Partial<HealthOptions>>({});
  const options = { ...props.options, ...overrides };
  function onPreferences(changes: Partial<HealthOptions>) {
    if (!props.isEditMode) setOverrides((previous) => ({ ...previous, ...changes }));
  }
  const integrationsQuery = clientApi.integration.byIds.useQuery(props.integrationIds, { refetchInterval: false });
  const t = useI18n("widget.healthMonitoring");
  const advanced = useI18n("item.advancedFocus");
  const coarsePointer = useMediaQuery("(any-pointer: coarse)");
  const showExpand =
    coarsePointer && props.displayMode !== "advanced" && !props.isEditMode && Boolean(props.openAdvancedView);
  const accessible = getUsableWidgetQueryData(integrationsQuery);
  const { integrations, clusterIntegrationIds, systemIntegrationIds } = useMemo(() => {
    const byId = new Map(accessible?.map((integration) => [integration.id, integration]));
    const selected = props.integrationIds.flatMap((id) => {
      const integration = byId.get(id);
      if (integration) return [integration];
      return [];
    });
    return { integrations: selected, ...partitionHealthMonitoringIntegrations(selected) };
  }, [accessible, props.integrationIds]);
  if (isInitialWidgetQueryPending(integrationsQuery)) return <WidgetQueryLoadingState />;
  const system = (
    <BoundedSystems
      {...props}
      options={options}
      integrations={integrations}
      integrationIds={systemIntegrationIds}
      onPreferences={onPreferences}
    />
  );
  const clusters = <ClusterPanels {...props} integrationIds={clusterIntegrationIds} />;
  const expandIcon = (
    <ActionIcon
      size={44}
      variant="subtle"
      color="gray"
      aria-label={advanced("open")}
      aria-haspopup="dialog"
      onClick={props.openAdvancedView}
    >
      <IconArrowsMaximize style={zoomCompensatedSize(18)} aria-hidden />
    </ActionIcon>
  );
  if (clusterIntegrationIds.length === 0 || systemIntegrationIds.length === 0) {
    let panel = system;
    if (systemIntegrationIds.length === 0 && clusterIntegrationIds.length > 0) panel = clusters;
    if (!showExpand) return panel;
    const short = props.height < 120;
    return (
      <Flex h="100%" mih={0} miw={0} direction={short ? "row" : "column"}>
        <Box flex={1} miw={0} mih={0}>
          {panel}
        </Box>
        {short ? (
          expandIcon
        ) : (
          <Button
            h={44}
            aria-haspopup="dialog"
            variant="subtle"
            color="gray"
            onClick={props.openAdvancedView}
            style={{ flexShrink: 0 }}
            leftSection={<IconArrowsMaximize style={zoomCompensatedSize(16)} aria-hidden />}
          >
            {advanced("open")}
          </Button>
        )}
      </Flex>
    );
  }
  const tabs: ("system" | "cluster")[] = ["system", "cluster"];
  if (props.options.tabOrder === "cluster-first") tabs.reverse();
  return (
    <Tabs
      value={options.defaultTab}
      onChange={(value) => {
        if (value === "system" || value === "cluster") onPreferences({ defaultTab: value });
      }}
      h="100%"
      style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <Group gap={0} wrap="nowrap" style={{ flexShrink: 0 }}>
        <Tabs.List grow flex={1} miw={0} style={{ flexWrap: "nowrap" }}>
          {tabs.map((tab) => (
            <Tabs.Tab
              key={tab}
              value={tab}
              fz="xs"
              miw={0}
              px={props.width < 240 ? 4 : undefined}
              mih={showExpand ? 44 : undefined}
              disabled={props.isEditMode}
            >
              {t(("tab." + tab) as "tab.system")}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {showExpand && expandIcon}
      </Group>
      <Tabs.Panel value="system" style={{ flex: 1, minHeight: 0 }}>
        {system}
      </Tabs.Panel>
      <Tabs.Panel value="cluster" style={{ flex: 1, minHeight: 0 }}>
        {clusters}
      </Tabs.Panel>
    </Tabs>
  );
}

function BoundedSystems(
  props: Props & {
    integrations: RouterOutputs["integration"]["byIds"];
    onPreferences: (changes: Partial<HealthOptions>) => void;
  },
) {
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
  const namesQuery = clientApi.widget.healthMonitoring.getClusterIntegrationNames.useQuery(
    { integrationIds: props.integrationIds },
    { refetchInterval: false },
  );
  let names = namesQuery.data ?? [];
  if (isTrpcForbiddenError(namesQuery.error)) names = [];
  const namesById = new Map(names.map((integration) => [integration.integrationId, integration.integrationName]));
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
            label: namesById.get(integrationId) ?? "Proxmox " + (index + 1),
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
          integrationName={namesById.get(id)}
          width={bounds.width || props.width}
          height={bounds.height || props.height}
          displayScale={1}
        />
      </Box>
    </Stack>
  );
}
