import type { KubeConfig, V1OwnerReference, V1ReplicaSet } from "@kubernetes/client-node";
import { AppsV1Api } from "@kubernetes/client-node";
import { TRPCError } from "@trpc/server";

import { splitToChunksWithNItems } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import type { KubernetesPod } from "@homarr/definitions";

import { kubernetesMiddleware } from "../../../middlewares/kubernetes";
import { createTRPCRouter, permissionRequiredProcedure } from "../../../trpc";
import { getKubernetesClient, kubernetesContextInput } from "../kubernetes-context";

const logger = createLogger({ module: "podsRouter" });

export const podsRouter = createTRPCRouter({
  getPods: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "List Kubernetes pod inventory and inferred workload types for a context. Get the required contextId from kubernetes_contexts_getContexts. Requires admin permission.",
      },
    })
    .concat(kubernetesMiddleware())
    .input(kubernetesContextInput)
    .query(async ({ input }): Promise<KubernetesPod[]> => {
      const { coreApi, kubeConfig } = getKubernetesClient(input.contextId);
      try {
        const podsResp = await coreApi.listPodForAllNamespaces();

        const pods: KubernetesPod[] = [];
        const replicaSets = new Map<string, Promise<V1ReplicaSet>>();

        for (const chunk of splitToChunksWithNItems(podsResp.items, 4)) {
          const resolvedPods = await Promise.all(
            chunk.map(async (pod) => {
              const labels = pod.metadata?.labels ?? {};
              const ownerRefs = pod.metadata?.ownerReferences ?? [];

              let applicationType = "Pod";

              if (labels["app.kubernetes.io/managed-by"] === "Helm") {
                applicationType = "Helm";
              } else {
                for (const owner of ownerRefs) {
                  if (["Deployment", "StatefulSet", "DaemonSet"].includes(owner.kind)) {
                    applicationType = owner.kind;
                    break;
                  } else if (owner.kind === "ReplicaSet") {
                    const ownerType = await getOwnerKind(kubeConfig, owner, pod.metadata?.namespace ?? "", replicaSets);
                    if (ownerType) {
                      applicationType = ownerType;
                      break;
                    }
                  }
                }
              }

              return {
                name: pod.metadata?.name ?? "",
                namespace: pod.metadata?.namespace ?? "",
                image: pod.spec?.containers.map((container) => container.image).join(", "),
                applicationType,
                status: pod.status?.phase ?? "unknown",
                creationTimestamp: pod.metadata?.creationTimestamp,
              };
            }),
          );
          pods.push(...resolvedPods);
        }

        return pods;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching Kubernetes pods",
          cause: error,
        });
      }
    }),
});

async function getOwnerKind(
  kubeConfig: KubeConfig,
  ownerRef: V1OwnerReference,
  namespace: string,
  replicaSets: Map<string, Promise<V1ReplicaSet>>,
): Promise<string | null> {
  const { kind, name } = ownerRef;

  if (kind === "ReplicaSet") {
    const appsApi = kubeConfig.makeApiClient(AppsV1Api);
    const key = `${namespace}/${name}`;
    let replicaSet = replicaSets.get(key);
    const sharedLookup = Boolean(replicaSet);
    let ownerReadCompleted = false;
    try {
      if (!replicaSet) {
        replicaSet = appsApi.readNamespacedReplicaSet({ name, namespace });
        replicaSets.set(key, replicaSet);
      }
      const rsResp = await replicaSet;
      ownerReadCompleted = true;

      if (rsResp.metadata?.ownerReferences) {
        for (const rsOwner of rsResp.metadata.ownerReferences) {
          if (rsOwner.kind === "Deployment") {
            return "Deployment";
          }
          const parentKind = await getOwnerKind(kubeConfig, rsOwner, namespace, replicaSets);
          if (parentKind) return parentKind;
        }
      }
      return "ReplicaSet";
    } catch (error) {
      if (!ownerReadCompleted) {
        if (replicaSets.get(key) === replicaSet) replicaSets.delete(key);
        // A shared failure must not prevent later references from retrying their own read.
        if (sharedLookup) return getOwnerKind(kubeConfig, ownerRef, namespace, replicaSets);
      }
      logger.error("Error reading ReplicaSet:", error);
      return null;
    }
  }

  if (["Deployment", "StatefulSet", "DaemonSet"].includes(kind)) {
    return kind;
  }

  return null;
}
