import type { KubernetesClient, KubernetesContextStatus } from "../../../router/kubernetes/kubernetes-client";
import type { AuthenticatedBackendContext } from "../../context";
import type { SourceLeafPath } from "../../port-map";

export type { KubernetesContextStatus } from "../../../router/kubernetes/kubernetes-client";

export type KubernetesLeafPath = Extract<SourceLeafPath, `kubernetes.${string}`>;

export type KubernetesOwnedClient = Pick<
  KubernetesClient,
  "coreApi" | "networkingApi" | "versionApi" | "kubeConfig" | "getNodeMetricsAsync"
>;

export interface KubernetesRequestLease {
  readonly clients: ReadonlyMap<string, KubernetesOwnedClient>;
  readonly defaultContextId: string;
  dispose(): void | Promise<void>;
}

export interface KubernetesProcedureResources {
  readonly enabled: boolean;
  bindRequest(context: AuthenticatedBackendContext): KubernetesRequestLease;
  replicaSetReadError(message: "Error reading ReplicaSet:", error: unknown): void;
}

export function bindKubernetesRequest(context: AuthenticatedBackendContext, resources: KubernetesProcedureResources) {
  const lease = resources.bindRequest(context);
  context.onDispose(() => lease.dispose());
  return lease;
}

export type KubernetesContextsResult = {
  contexts: KubernetesContextStatus[];
  defaultContextId: string;
};
