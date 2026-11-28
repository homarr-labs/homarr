import type { IntegrationKind } from "@homarr/definitions";
import type { ClusterHealthMonitoring, SystemHealthMonitoring } from "@homarr/integrations/types";

export type HealthSystemKind = Extract<
  IntegrationKind,
  "openmediavault" | "dashDot" | "truenas" | "unraid" | "glances" | "synology" | "mock"
>;

export interface HealthSystemFixture {
  id: string;
  name: string;
  kind: HealthSystemKind;
  health: SystemHealthMonitoring | null;
  updatedAt: number;
  error?: string;
}

export interface HealthPreviewData {
  systems: HealthSystemFixture[];
  cluster: ClusterHealthMonitoring | null;
  loading?: boolean;
}
