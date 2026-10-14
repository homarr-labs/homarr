import { ORPCError } from "@orpc/server";

import type {
  KubernetesBaseResource,
  KubernetesIngress,
  KubernetesSecret,
  KubernetesService,
  KubernetesVolume,
} from "@homarr/definitions";

import { authenticatedProcedure, sourceProjectionMeta } from "../procedure";
import {
  getClusterAsync,
  getClusterResourceCountsAsync,
  getContextsAsync,
  getKubernetesClient,
  getNodesAsync,
  getPodsAsync,
  kubernetesContextInput,
} from "./-kubernetes/helpers";
import type { KubernetesLeafPath, KubernetesProcedureResources } from "./-kubernetes/resources";
import { bindKubernetesRequest } from "./-kubernetes/resources";

export type {
  KubernetesProcedureResources,
  KubernetesRequestLease,
  KubernetesOwnedClient,
} from "./-kubernetes/resources";

export const kubernetesImplementedPaths = [
  "kubernetes.contexts.getContexts",
  "kubernetes.nodes.getNodes",
  "kubernetes.cluster.getCluster",
  "kubernetes.cluster.getClusterResourceCounts",
  "kubernetes.namespaces.getNamespaces",
  "kubernetes.ingresses.getIngresses",
  "kubernetes.services.getServices",
  "kubernetes.pods.getPods",
  "kubernetes.secrets.getSecrets",
  "kubernetes.configMaps.getConfigMaps",
  "kubernetes.volumes.getVolumes",
] as const satisfies readonly KubernetesLeafPath[];

export const kubernetesBindingHolds = [
  "All eleven leaf bodies are unmounted candidates, not accepted or live bindings.",
  "ENABLE_KUBERNETES and the current request principal require an authoritative host binding.",
  "Configured context enumeration, default-context selection, credentials and concrete Kubernetes clients require owned request leases.",
  "Node metrics must retain the source metrics.k8s.io/v1beta1 nodes request, abortable five-second timeout and credential ownership.",
  "Request disposal, cancellation and ReplicaSet diagnostics require host-owned lifecycle and logging bindings.",
  "Frozen shared error mapping masks internal source messages; exact transport error parity remains held.",
  "Namespace phase remains the actual string-or-undefined projection; the legacy unsafe narrow output assertion is not reproduced.",
] as const;

export function createKubernetesProcedures(resources: KubernetesProcedureResources) {
  if (
    typeof resources.enabled !== "boolean" ||
    typeof resources.bindRequest !== "function" ||
    typeof resources.replicaSetReadError !== "function"
  ) {
    throw new Error("Kubernetes availability, request-owned clients and diagnostics are required");
  }
  const procedure = (path: KubernetesLeafPath) =>
    authenticatedProcedure({
      path,
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    }).use(({ next }) => {
      if (!resources.enabled) throw new ORPCError("NOT_FOUND", { message: "Kubernetes route is not available" });
      return next();
    });

  return {
    contexts: {
      getContexts: procedure("kubernetes.contexts.getContexts")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "List configured Kubernetes contexts with availability, metrics status, and default-context metadata. Requires admin permission.",
            },
          }),
        )
        .handler(async ({ context }) => await getContextsAsync(bindKubernetesRequest(context, resources))),
    },
    nodes: {
      getNodes: procedure("kubernetes.nodes.getNodes")
        .input(kubernetesContextInput)
        .handler(async ({ input, context }) => {
          const client = getKubernetesClient(bindKubernetesRequest(context, resources), input.contextId);
          try {
            return await getNodesAsync(client);
          } catch (error) {
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: "An error occurred while fetching Kubernetes nodes",
              cause: error,
            });
          }
        }),
    },
    cluster: {
      getCluster: procedure("kubernetes.cluster.getCluster")
        .input(kubernetesContextInput)
        .handler(async ({ input, context }) => {
          const client = getKubernetesClient(bindKubernetesRequest(context, resources), input.contextId);
          try {
            return await getClusterAsync(client);
          } catch (error) {
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: "An error occurred while fetching Kubernetes cluster",
              cause: error,
            });
          }
        }),
      getClusterResourceCounts: procedure("kubernetes.cluster.getClusterResourceCounts")
        .input(kubernetesContextInput)
        .handler(async ({ input, context }) => {
          const client = getKubernetesClient(bindKubernetesRequest(context, resources), input.contextId);
          try {
            return await getClusterResourceCountsAsync(client);
          } catch (error) {
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: "An error occurred while fetching Kubernetes resources count",
              cause: error,
            });
          }
        }),
    },
    namespaces: {
      getNamespaces: procedure("kubernetes.namespaces.getNamespaces")
        .input(kubernetesContextInput)
        .handler(async ({ input, context }) => {
          const { coreApi } = getKubernetesClient(bindKubernetesRequest(context, resources), input.contextId);
          try {
            const namespaces = await coreApi.listNamespace();
            return namespaces.items.map((namespace) => ({
              status: namespace.status?.phase,
              name: namespace.metadata?.name ?? "unknown",
              creationTimestamp: namespace.metadata?.creationTimestamp,
            }));
          } catch (error) {
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: "An error occurred while fetching Kubernetes namespaces",
              cause: error,
            });
          }
        }),
    },
    ingresses: {
      getIngresses: procedure("kubernetes.ingresses.getIngresses")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "List Kubernetes ingress inventory for a context. Get the required contextId from kubernetes_contexts_getContexts. Requires admin permission.",
            },
          }),
        )
        .input(kubernetesContextInput)
        .handler(async ({ input, context }): Promise<KubernetesIngress[]> => {
          const { networkingApi } = getKubernetesClient(bindKubernetesRequest(context, resources), input.contextId);
          try {
            const ingresses = await networkingApi.listIngressForAllNamespaces();
            return ingresses.items.map((ingress) => ({
              name: ingress.metadata?.name ?? "",
              namespace: ingress.metadata?.namespace ?? "",
              className: ingress.spec?.ingressClassName ?? "",
              rulesAndPaths: (ingress.spec?.rules ?? []).map((rule) => ({
                host: rule.host ?? "",
                paths: (rule.http?.paths ?? []).map((path) => ({
                  serviceName: path.backend.service?.name ?? "",
                  port: path.backend.service?.port?.number ?? 0,
                })),
              })),
              creationTimestamp: ingress.metadata?.creationTimestamp,
            }));
          } catch (error) {
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: "An error occurred while fetching Kubernetes ingresses",
              cause: error,
            });
          }
        }),
    },
    services: {
      getServices: procedure("kubernetes.services.getServices")
        .input(kubernetesContextInput)
        .handler(async ({ input, context }): Promise<KubernetesService[]> => {
          const { coreApi } = getKubernetesClient(bindKubernetesRequest(context, resources), input.contextId);
          try {
            const services = await coreApi.listServiceForAllNamespaces();
            return services.items.map((service) => ({
              name: service.metadata?.name ?? "unknown",
              namespace: service.metadata?.namespace ?? "",
              type: service.spec?.type ?? "",
              ports: service.spec?.ports?.map(({ port, protocol }) => `${port}/${protocol}`),
              targetPorts: service.spec?.ports?.map(({ targetPort }) => `${targetPort}`),
              clusterIP: service.spec?.clusterIP ?? "",
              creationTimestamp: service.metadata?.creationTimestamp,
            }));
          } catch (error) {
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: "An error occurred while fetching Kubernetes services",
              cause: error,
            });
          }
        }),
    },
    pods: {
      getPods: procedure("kubernetes.pods.getPods")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "List Kubernetes pod inventory and inferred workload types for a context. Get the required contextId from kubernetes_contexts_getContexts. Requires admin permission.",
            },
          }),
        )
        .input(kubernetesContextInput)
        .handler(async ({ input, context }) => {
          const client = getKubernetesClient(bindKubernetesRequest(context, resources), input.contextId);
          try {
            return await getPodsAsync(client, resources);
          } catch (error) {
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: "An error occurred while fetching Kubernetes pods",
              cause: error,
            });
          }
        }),
    },
    secrets: {
      getSecrets: procedure("kubernetes.secrets.getSecrets")
        .input(kubernetesContextInput)
        .handler(async ({ input, context }): Promise<KubernetesSecret[]> => {
          const { coreApi } = getKubernetesClient(bindKubernetesRequest(context, resources), input.contextId);
          try {
            const secrets = await coreApi.listSecretForAllNamespaces();
            return secrets.items.map((secret) => ({
              name: secret.metadata?.name ?? "unknown",
              namespace: secret.metadata?.namespace ?? "unknown",
              type: secret.type ?? "unknown",
              creationTimestamp: secret.metadata?.creationTimestamp,
            }));
          } catch (error) {
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: "An error occurred while fetching Kubernetes secrets",
              cause: error,
            });
          }
        }),
    },
    configMaps: {
      getConfigMaps: procedure("kubernetes.configMaps.getConfigMaps")
        .input(kubernetesContextInput)
        .handler(async ({ input, context }): Promise<KubernetesBaseResource[]> => {
          const { coreApi } = getKubernetesClient(bindKubernetesRequest(context, resources), input.contextId);
          try {
            const configMaps = await coreApi.listConfigMapForAllNamespaces();
            return configMaps.items.map((configMap) => ({
              name: configMap.metadata?.name ?? "unknown",
              namespace: configMap.metadata?.namespace ?? "unknown",
              creationTimestamp: configMap.metadata?.creationTimestamp,
            }));
          } catch (error) {
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: "An error occurred while fetching Kubernetes ConfigMaps",
              cause: error,
            });
          }
        }),
    },
    volumes: {
      getVolumes: procedure("kubernetes.volumes.getVolumes")
        .input(kubernetesContextInput)
        .handler(async ({ input, context }): Promise<KubernetesVolume[]> => {
          const { coreApi } = getKubernetesClient(bindKubernetesRequest(context, resources), input.contextId);
          try {
            const volumes = await coreApi.listPersistentVolumeClaimForAllNamespaces();
            return volumes.items.map((volume) => ({
              name: volume.metadata?.name ?? "unknown",
              namespace: volume.metadata?.namespace ?? "unknown",
              accessModes: volume.status?.accessModes?.map((accessMode) => accessMode) ?? [],
              storage: volume.status?.capacity?.storage ?? "",
              storageClassName: volume.spec?.storageClassName ?? "",
              volumeMode: volume.spec?.volumeMode ?? "",
              volumeName: volume.spec?.volumeName ?? "",
              status: volume.status?.phase ?? "",
              creationTimestamp: volume.metadata?.creationTimestamp,
            }));
          } catch (error) {
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: "An error occurred while fetching Kubernetes Volumes",
              cause: error,
            });
          }
        }),
    },
  };
}
