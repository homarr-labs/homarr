import { healthMonitoringClusterIntegrationKinds, healthMonitoringSystemIntegrationKinds } from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";

interface HealthMonitoringIntegration {
  id: string;
  kind: IntegrationKind;
}

const systemIntegrationKinds = new Set<IntegrationKind>(healthMonitoringSystemIntegrationKinds);
const clusterIntegrationKinds = new Set<IntegrationKind>(healthMonitoringClusterIntegrationKinds);

export const partitionHealthMonitoringIntegrations = (integrations: HealthMonitoringIntegration[]) => ({
  clusterIntegrationIds: integrations.filter(({ kind }) => clusterIntegrationKinds.has(kind)).map(({ id }) => id),
  // Mock implements both contracts and remains visible in both views.
  systemIntegrationIds: integrations.filter(({ kind }) => systemIntegrationKinds.has(kind)).map(({ id }) => id),
});
