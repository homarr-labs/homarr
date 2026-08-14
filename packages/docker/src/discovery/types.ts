import type { ContainerInfo } from "dockerode";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";

export interface DiscoveredService {
  sourceId: string;
  containerId: string;
  host: string;
  group?: string;
  name: string;
  href: string;
  icon?: string;
  description?: string;
  pingUrl?: string;
  externalId: string;
  boardName?: string;
  integrationKind?: IntegrationKind;
  widgetKind?: WidgetKind;
}

export type DockerDiscoveryHostResult =
  | {
      host: string;
      status: "success";
      containers: ContainerInfo[];
      services: DiscoveredService[];
    }
  | {
      host: string;
      status: "unavailable";
      reason: string;
      containers: [];
      services: [];
    };

export interface DockerDiscoveryResult {
  hosts: DockerDiscoveryHostResult[];
  services: DiscoveredService[];
}
