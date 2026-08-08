import type { IntegrationKind } from "@homarr/definitions";

interface HealthMonitoringIntegration {
  id: string;
  kind: IntegrationKind;
}

export const partitionHealthMonitoringIntegrations = (integrations: HealthMonitoringIntegration[]) => ({
  clusterIntegrationIds: integrations.filter(({ kind }) => kind === "proxmox" || kind === "mock").map(({ id }) => id),
  // Mock implements both contracts and remains visible in both views.
  systemIntegrationIds: integrations.filter(({ kind }) => kind !== "proxmox").map(({ id }) => id),
});
