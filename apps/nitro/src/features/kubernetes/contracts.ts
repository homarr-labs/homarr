import type { InferClientOutputs } from "@orpc/client";
import type { RouterClient } from "@orpc/server";

import type { createKubernetesProcedures } from "../../../../../packages/api/src/nitro/routers/kubernetes";
import type { kubernetesViews } from "../../source-ui/kubernetes/contracts";

export { kubernetesViews } from "../../source-ui/kubernetes/contracts";

export type KubernetesClient = RouterClient<ReturnType<typeof createKubernetesProcedures>>;
export type KubernetesOutputs = InferClientOutputs<KubernetesClient>;
export type KubernetesContexts = KubernetesOutputs["contexts"]["getContexts"];
export type KubernetesContext = KubernetesContexts["contexts"][number];
export type KubernetesCluster = KubernetesOutputs["cluster"]["getCluster"];

export type KubernetesView = (typeof kubernetesViews)[number]["value"];
export type KubernetesInventoryView = Exclude<KubernetesView, "cluster" | "contexts">;

export interface KubernetesInventoryOutputs {
  nodes: KubernetesOutputs["nodes"]["getNodes"];
  namespaces: KubernetesOutputs["namespaces"]["getNamespaces"];
  pods: KubernetesOutputs["pods"]["getPods"];
  services: KubernetesOutputs["services"]["getServices"];
  ingresses: KubernetesOutputs["ingresses"]["getIngresses"];
  secrets: KubernetesOutputs["secrets"]["getSecrets"];
  configMaps: KubernetesOutputs["configMaps"]["getConfigMaps"];
  volumes: KubernetesOutputs["volumes"]["getVolumes"];
}

export type KubernetesInventory = {
  [View in KubernetesInventoryView]: { kind: View; items: KubernetesInventoryOutputs[View] };
}[KubernetesInventoryView];

export interface KubernetesFeatureProps {
  client: KubernetesClient;
  authorityKey: string;
  requestedContextId?: string | null;
  onContextChange(contextId: string): void;
  view?: KubernetesView;
  onViewChange?(view: KubernetesView): void;
  assetBase?: string;
  onCheckLogs?(): void;
}
