import type {
  KubernetesBaseResource,
  KubernetesIngress,
  KubernetesNode,
  KubernetesPod,
  KubernetesSecret,
  KubernetesService,
  KubernetesVolume,
} from "@homarr/definitions";

export interface KubernetesContextMetadata {
  contextId: string;
  name: string;
  status: "available" | "degraded" | "unavailable";
  metricsStatus: "available" | "unavailable" | "unknown";
  isDefault: boolean;
}

export interface KubernetesContextsMetadata {
  contexts: KubernetesContextMetadata[];
  defaultContextId: string;
}

export const kubernetesViews = [
  { value: "cluster", label: "Cluster" },
  { value: "contexts", label: "Contexts" },
  { value: "nodes", label: "Nodes" },
  { value: "namespaces", label: "Namespaces" },
  { value: "pods", label: "Pods" },
  { value: "services", label: "Services" },
  { value: "ingresses", label: "Ingresses" },
  { value: "secrets", label: "Secrets" },
  { value: "configMaps", label: "ConfigMaps" },
  { value: "volumes", label: "Volumes" },
] as const;

export type KubernetesPresentationView = (typeof kubernetesViews)[number]["value"];
export type KubernetesResourceView = Exclude<KubernetesPresentationView, "cluster" | "contexts">;

export interface KubernetesResourceData {
  nodes: KubernetesNode[];
  namespaces: (KubernetesBaseResource & { status: string | undefined })[];
  pods: KubernetesPod[];
  services: KubernetesService[];
  ingresses: KubernetesIngress[];
  secrets: KubernetesSecret[];
  configMaps: KubernetesBaseResource[];
  volumes: KubernetesVolume[];
}

export type KubernetesDisplayInventory = {
  [View in KubernetesResourceView]: { kind: View; items: KubernetesResourceData[View] };
}[KubernetesResourceView];
