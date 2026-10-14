"use client";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import { ClusterHealthMonitoring } from "./cluster/cluster-health";
import { partitionHealthMonitoringIntegrations } from "./integration-selection";
import { SystemHealthMonitoring } from "./system-health";
import { NativeHealthMonitoringView } from "./native-view";

dayjs.extend(duration);

export default function HealthMonitoringWidget(props: WidgetComponentProps<"healthMonitoring">) {
  const integrationsQuery = clientApi.integration.byIds.useQuery(props.integrationIds);
  if (isInitialWidgetQueryPending(integrationsQuery)) return <WidgetQueryLoadingState />;
  const integrations = getUsableWidgetQueryData(integrationsQuery) ?? [];
  const { clusterIntegrationIds, systemIntegrationIds } = partitionHealthMonitoringIntegrations(integrations);

  return (
    <NativeHealthMonitoringView
      options={props.options}
      width={props.width}
      displayMode={props.displayMode}
      clusterIntegrationIds={clusterIntegrationIds}
      systemIntegrationIds={systemIntegrationIds}
      renderSystem={(withScrollArea) => (
        <SystemHealthMonitoring {...props} integrationIds={systemIntegrationIds} withScrollArea={withScrollArea} />
      )}
      renderCluster={(integrationId, keyed) => (
        <ClusterHealthMonitoring key={keyed ? integrationId : undefined} {...props} integrationId={integrationId} />
      )}
    />
  );
}
