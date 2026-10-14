import type {
  KubeConfig,
  RequestContext,
  ResponseContext,
  V1NodeList,
  V1OwnerReference,
  VersionInfo,
} from "@kubernetes/client-node";
import { AppsV1Api } from "@kubernetes/client-node";
import { of } from "@kubernetes/client-node/dist/gen/rxjsStub.js";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import type {
  ClusterResourceCount,
  KubernetesCluster,
  KubernetesNode,
  KubernetesNodeState,
  KubernetesPod,
} from "@homarr/definitions";
import { invariantTechnicalLabels } from "@homarr/definitions";

import { calculateResourcePercentage } from "../../../router/kubernetes/resource-percentage";
import { CpuResourceParser } from "../../../router/kubernetes/resource-parser/cpu-resource-parser";
import { MemoryResourceParser } from "../../../router/kubernetes/resource-parser/memory-resource-parser";
import type {
  KubernetesContextsResult,
  KubernetesContextStatus,
  KubernetesOwnedClient,
  KubernetesProcedureResources,
  KubernetesRequestLease,
} from "./resources";

export const kubernetesContextInput = z.object({ contextId: z.string().min(1) });

const kubernetesContextProbeTimeoutMs = 5_000;

export function getKubernetesClient(lease: KubernetesRequestLease, contextId: string): KubernetesOwnedClient {
  const client = lease.clients.get(contextId);
  if (!client) throw new ORPCError("NOT_FOUND", { message: `Kubernetes context '${contextId}' was not found` });
  return client;
}

async function withKubernetesProbeTimeoutAsync<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutError = new Error("Kubernetes context probe timed out");
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort(timeoutError);
          reject(timeoutError);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

const abortableKubernetesRequest = (signal: AbortSignal) => ({
  middleware: [
    {
      pre: (request: RequestContext) => {
        request.setSignal(signal);
        return of(request);
      },
      post: (response: ResponseContext) => of(response),
    },
  ],
});

export async function getContextsAsync(lease: KubernetesRequestLease): Promise<KubernetesContextsResult> {
  const contexts = await Promise.all(
    [...lease.clients.entries()].map(async ([contextId, client]): Promise<KubernetesContextStatus> => {
      const [api, metrics] = await Promise.allSettled([
        withKubernetesProbeTimeoutAsync(
          async (signal) => await client.versionApi.getCode(undefined, abortableKubernetesRequest(signal)),
          kubernetesContextProbeTimeoutMs,
        ),
        client.getNodeMetricsAsync(kubernetesContextProbeTimeoutMs),
      ]);
      const status =
        api.status === "rejected" ? "unavailable" : metrics.status === "rejected" ? "degraded" : "available";
      return {
        contextId,
        name: contextId,
        status,
        metricsStatus:
          api.status === "rejected" ? "unknown" : metrics.status === "rejected" ? "unavailable" : "available",
        isDefault: contextId === lease.defaultContextId,
      };
    }),
  );
  return { contexts, defaultContextId: lease.defaultContextId };
}

export async function getNodesAsync(client: KubernetesOwnedClient): Promise<KubernetesNode[]> {
  const [nodes, nodeMetricsClient] = await Promise.all([
    client.coreApi.listNode(),
    client.getNodeMetricsAsync().catch(() => null),
  ]);
  const cpuResourceParser = new CpuResourceParser();
  const memoryResourceParser = new MemoryResourceParser();
  return nodes.items.map((node) => {
    const name = node.metadata?.name ?? "unknown";
    const readyCondition = node.status?.conditions?.find((condition) => condition.type === "Ready");
    const status: KubernetesNodeState = readyCondition?.status === "True" ? "Ready" : "NotReady";
    const cpuAllocatable = cpuResourceParser.parse(node.status?.allocatable?.cpu ?? "0");
    const memoryAllocatable = memoryResourceParser.parse(node.status?.allocatable?.memory ?? "0");
    let cpuUsage = 0;
    let memoryUsage = 0;
    const nodeMetric = nodeMetricsClient?.items.find((metric) => metric.metadata.name === name);
    if (nodeMetric) {
      cpuUsage += cpuResourceParser.parse(nodeMetric.usage.cpu);
      memoryUsage += memoryResourceParser.parse(nodeMetric.usage.memory);
    }
    const usagePercentageCPUAllocatable = nodeMetric ? calculateResourcePercentage(cpuUsage, cpuAllocatable) : null;
    const usagePercentageMemoryAllocatable = nodeMetric
      ? calculateResourcePercentage(memoryUsage, memoryAllocatable)
      : null;
    return {
      name,
      status,
      allocatableCpuPercentage:
        usagePercentageCPUAllocatable === null ? null : Math.round(usagePercentageCPUAllocatable),
      allocatableRamPercentage:
        usagePercentageMemoryAllocatable === null ? null : Math.round(usagePercentageMemoryAllocatable),
      podsCount: Number(node.status?.capacity?.pods),
      operatingSystem: node.status?.nodeInfo?.operatingSystem,
      architecture: node.status?.nodeInfo?.architecture,
      kubernetesVersion: node.status?.nodeInfo?.kubeletVersion,
      creationTimestamp: node.metadata?.creationTimestamp,
    };
  });
}

export async function getClusterAsync(client: KubernetesOwnedClient): Promise<KubernetesCluster> {
  const [versionInfo, nodes, listPodForAllNamespaces, nodeMetricsClient] = await Promise.all([
    client.versionApi.getCode(),
    client.coreApi.listNode(),
    client.coreApi.listPodForAllNamespaces(),
    client.getNodeMetricsAsync().catch(() => null),
  ]);
  let totalCPUCapacity = 0;
  let totalCPUAllocatable = 0;
  let totalCPUUsage = 0;
  let totalMemoryCapacity = 0;
  let totalMemoryAllocatable = 0;
  let totalMemoryUsage = 0;
  let totalCapacityPods = 0;
  const cpuResourceParser = new CpuResourceParser();
  const memoryResourceParser = new MemoryResourceParser();
  nodes.items.forEach((node) => {
    totalCapacityPods += Number(node.status?.capacity?.pods);
    totalCPUCapacity += cpuResourceParser.parse(node.status?.capacity?.cpu ?? "0");
    totalCPUAllocatable += cpuResourceParser.parse(node.status?.allocatable?.cpu ?? "0");
    totalMemoryCapacity += memoryResourceParser.parse(node.status?.capacity?.memory ?? "0");
    totalMemoryAllocatable += memoryResourceParser.parse(node.status?.allocatable?.memory ?? "0");
    const nodeName = node.metadata?.name;
    const nodeMetric = nodeMetricsClient?.items.find((metric) => metric.metadata.name === nodeName);
    if (nodeMetric) {
      totalCPUUsage += cpuResourceParser.parse(nodeMetric.usage.cpu);
      totalMemoryUsage += memoryResourceParser.parse(nodeMetric.usage.memory);
    }
  });
  const reservedCPU = totalCPUCapacity - totalCPUAllocatable;
  const reservedMemory = totalMemoryCapacity - totalMemoryAllocatable;
  const reservedCPUPercentage = calculateResourcePercentage(reservedCPU, totalCPUCapacity);
  const reservedMemoryPercentage = calculateResourcePercentage(reservedMemory, totalMemoryCapacity);
  const usagePercentageAllocatable = calculateResourcePercentage(totalCPUUsage, totalCPUAllocatable);
  const usagePercentageMemoryAllocatable = calculateResourcePercentage(totalMemoryUsage, totalMemoryAllocatable);
  const usedPodsPercentage = calculateResourcePercentage(listPodForAllNamespaces.items.length, totalCapacityPods);
  return {
    name: client.kubeConfig.getCurrentContext(),
    providers: getProviders(versionInfo, nodes),
    kubernetesVersion: versionInfo.gitVersion,
    architecture: versionInfo.platform,
    nodeCount: nodes.items.length,
    metricsAvailable: nodeMetricsClient !== null,
    capacity: [
      {
        type: invariantTechnicalLabels.cpu,
        resourcesStats: [
          {
            percentageValue: reservedCPUPercentage,
            type: "Reserved",
            capacityUnit: "Cores",
            usedValue: Number(reservedCPU.toFixed(2)),
            maxUsedValue: Number(totalCPUCapacity.toFixed(2)),
          },
          ...(nodeMetricsClient
            ? [
                {
                  percentageValue: usagePercentageAllocatable,
                  type: "Used" as const,
                  capacityUnit: "Cores",
                  usedValue: Number(totalCPUUsage.toFixed(2)),
                  maxUsedValue: Number(totalCPUAllocatable.toFixed(2)),
                },
              ]
            : []),
        ],
      },
      {
        type: "Memory",
        resourcesStats: [
          {
            percentageValue: reservedMemoryPercentage,
            type: "Reserved",
            capacityUnit: "GiB",
            usedValue: Number(reservedMemory.toFixed(2)),
            maxUsedValue: Number(totalMemoryCapacity.toFixed(2)),
          },
          ...(nodeMetricsClient
            ? [
                {
                  percentageValue: usagePercentageMemoryAllocatable,
                  type: "Used" as const,
                  capacityUnit: "GiB",
                  usedValue: Number(totalMemoryUsage.toFixed(2)),
                  maxUsedValue: Number(totalMemoryAllocatable.toFixed(2)),
                },
              ]
            : []),
        ],
      },
      {
        type: "Pods",
        resourcesStats: [
          {
            percentageValue: usedPodsPercentage,
            type: "Used",
            usedValue: listPodForAllNamespaces.items.length,
            maxUsedValue: totalCapacityPods,
          },
        ],
      },
    ],
  };
}

export async function getClusterResourceCountsAsync(client: KubernetesOwnedClient): Promise<ClusterResourceCount[]> {
  const [pods, ingresses, services, configMaps, namespaces, nodes, secrets, volumes] = await Promise.all([
    client.coreApi.listPodForAllNamespaces(),
    client.networkingApi.listIngressForAllNamespaces(),
    client.coreApi.listServiceForAllNamespaces(),
    client.coreApi.listConfigMapForAllNamespaces(),
    client.coreApi.listNamespace(),
    client.coreApi.listNode(),
    client.coreApi.listSecretForAllNamespaces(),
    client.coreApi.listPersistentVolumeClaimForAllNamespaces(),
  ]);
  return [
    { label: "nodes", count: nodes.items.length },
    { label: "namespaces", count: namespaces.items.length },
    { label: "ingresses", count: ingresses.items.length },
    { label: "services", count: services.items.length },
    { label: "pods", count: pods.items.length },
    { label: "secrets", count: secrets.items.length },
    { label: "configmaps", count: configMaps.items.length },
    { label: "volumes", count: volumes.items.length },
  ];
}

function getProviders(versionInfo: VersionInfo, nodes: V1NodeList) {
  const providers = new Set<string>();
  if (versionInfo.gitVersion.includes("k3s")) providers.add("k3s");
  if (versionInfo.gitVersion.includes("gke")) providers.add("GKE");
  if (versionInfo.gitVersion.includes("eks")) providers.add("EKS");
  if (versionInfo.gitVersion.includes("aks")) providers.add("AKS");
  nodes.items.forEach((node) => {
    const labels = node.metadata?.labels ?? {};
    const nodeProviderLabel = labels["node.kubernetes.io/instance-type"] ?? labels.provider ?? "";
    if (nodeProviderLabel.includes("aws")) providers.add("EKS");
    if (nodeProviderLabel.includes("azure")) providers.add("AKS");
    if (nodeProviderLabel.includes("gce")) providers.add("GKE");
    if (nodeProviderLabel.includes("k3s")) providers.add("k3s");
    const nodeInfo = node.status?.nodeInfo;
    if (nodeInfo) {
      const osImage = nodeInfo.osImage.toLowerCase();
      const kernelVersion = nodeInfo.kernelVersion.toLowerCase();
      if (osImage.includes("talos") || kernelVersion.includes("talos")) providers.add("Talos");
    }
  });
  return Array.from(providers).join(", ");
}

export async function getPodsAsync(
  client: KubernetesOwnedClient,
  resources: KubernetesProcedureResources,
): Promise<KubernetesPod[]> {
  const podsResp = await client.coreApi.listPodForAllNamespaces();
  const pods: KubernetesPod[] = [];
  for (const pod of podsResp.items) {
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
          const ownerType = await getOwnerKind(client.kubeConfig, owner, pod.metadata?.namespace ?? "", resources);
          if (ownerType) {
            applicationType = ownerType;
            break;
          }
        }
      }
    }
    pods.push({
      name: pod.metadata?.name ?? "",
      namespace: pod.metadata?.namespace ?? "",
      image: pod.spec?.containers.map((container) => container.image).join(", "),
      applicationType,
      status: pod.status?.phase ?? "unknown",
      creationTimestamp: pod.metadata?.creationTimestamp,
    });
  }
  return pods;
}

async function getOwnerKind(
  kubeConfig: KubeConfig,
  ownerRef: V1OwnerReference,
  namespace: string,
  resources: KubernetesProcedureResources,
): Promise<string | null> {
  const { kind, name } = ownerRef;
  if (kind === "ReplicaSet") {
    const appsApi = kubeConfig.makeApiClient(AppsV1Api);
    try {
      const rsResp = await appsApi.readNamespacedReplicaSet({ name, namespace });
      if (rsResp.metadata?.ownerReferences) {
        for (const rsOwner of rsResp.metadata.ownerReferences) {
          if (rsOwner.kind === "Deployment") return "Deployment";
          const parentKind = await getOwnerKind(kubeConfig, rsOwner, namespace, resources);
          if (parentKind) return parentKind;
        }
      }
      return "ReplicaSet";
    } catch (error) {
      resources.replicaSetReadError("Error reading ReplicaSet:", error);
      return null;
    }
  }
  if (["Deployment", "StatefulSet", "DaemonSet"].includes(kind)) return kind;
  return null;
}
