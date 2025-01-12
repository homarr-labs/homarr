import type { V1NodeList, VersionInfo } from "@kubernetes/client-node";
import * as k8s from "@kubernetes/client-node";
import { CoreV1Api, KubeConfig, Metrics, NetworkingV1Api } from "@kubernetes/client-node";
import { TRPCError } from "@trpc/server";

import type { ClusterResourceCount, KubernetesCluster, KubernetesNode, KubernetesNodeState } from "@homarr/definitions";
import { logger } from "@homarr/log";

import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";
import { ResourceParserFactory } from "./resource-parser/resource-parser-factory";

export const kubernetesRouter = createTRPCRouter({
  getNodes: permissionRequiredProcedure.requiresPermission("admin").query(async (): Promise<KubernetesNode[]> => {
    const kubeConfig = new KubeConfig();
    kubeConfig.loadFromDefault();

    const k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);

    try {
      const nodes = await k8sApi.listNode();

      return nodes.items.map((node) => {
        // Extract node name
        const name = node.metadata?.name ?? "unknown";

        // Determine node readiness status
        const readyCondition = node.status?.conditions?.find((condition) => condition.type === "Ready");
        const status: KubernetesNodeState = readyCondition?.status === "True" ? "Ready" : "NotReady";

        // Extract CPU cores
        const cpuRaw = node.status?.capacity?.cpu ?? "0";
        const cpuCores = cpuRaw.includes("m") ? parseInt(cpuRaw) / 1000 : parseInt(cpuRaw);

        // Extract and convert RAM (from Ki to GB)
        const memoryRaw = node.status?.capacity?.memory ?? "0";
        const memoryKi = parseInt(memoryRaw.replace("Ki", ""));
        const ramGB = memoryKi / 1024 / 1024; // Convert KiB to GiB

        // Extract Kubernetes version (from kubelet version)
        const kubeletVersion = node.status?.nodeInfo?.kubeletVersion ?? "unknown";
        const kubernetesVersion = kubeletVersion.startsWith("v") ? kubeletVersion.substring(1) : kubeletVersion;

        // Extract agent version (additional information if available)
        const agentVersion = node.status?.nodeInfo?.containerRuntimeVersion ?? "unknown";

        // Extract the last heartbeat time
        const lastHeartbeatTime = readyCondition?.lastHeartbeatTime ?? "unknown";

        return {
          name,
          status,
          ramGB: parseFloat(ramGB.toFixed(2)),
          cpuCores,
          agentVersion,
          kubernetesVersion,
          lastHeartbeatTime,
        };
      });
    } catch (error) {
      logger.error(error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while fetching Kubernetes nodes",
        cause: error,
      });
    }
  }),

  getCluster: permissionRequiredProcedure.requiresPermission("admin").query(async (): Promise<KubernetesCluster> => {
    const kubeConfig = new k8s.KubeConfig();
    kubeConfig.loadFromDefault();

    const k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
    const versionApi = kubeConfig.makeApiClient(k8s.VersionApi);

    try {
      const metricsClient = new Metrics(kubeConfig);
      const nodeMetricsClient = await metricsClient.getNodeMetrics();
      const versionInfo = await versionApi.getCode();

      const nodes = await k8sApi.listNode();

      let totalCPUCapacity = 0;
      let totalCPUAllocatable = 0;
      let totalCPUUsage = 0;

      let totalMemoryCapacity = 0;
      let totalMemoryAllocatable = 0;
      let totalMemoryUsage = 0;

      let totalCapacityPods = 0;

      const cpuParser = ResourceParserFactory.getParser("cpu");
      const MemoryParser = ResourceParserFactory.getParser("memory");

      const listPodForAllNamespaces = await k8sApi.listPodForAllNamespaces();

      nodes.items.forEach((node) => {
        totalCapacityPods += Number(node.status?.capacity?.pods);

        const cpuCapacity = cpuParser.parse(node.status?.capacity?.cpu ?? "0");
        const cpuAllocatable = cpuParser.parse(node.status?.allocatable?.cpu ?? "0");
        totalCPUCapacity += cpuCapacity;
        totalCPUAllocatable += cpuAllocatable;

        const memoryCapacity = MemoryParser.parse(node.status?.capacity?.memory ?? "0");
        const memoryAllocatable = MemoryParser.parse(node.status?.allocatable?.memory ?? "0");
        totalMemoryCapacity += memoryCapacity;
        totalMemoryAllocatable += memoryAllocatable;

        const nodeName = node.metadata?.name;
        const nodeMetric = nodeMetricsClient.items.find((metric) => metric.metadata.name === nodeName);
        if (nodeMetric) {
          const cpuUsage = cpuParser.parse(nodeMetric.usage.cpu);
          totalCPUUsage += cpuUsage;

          const memoryUsage = MemoryParser.parse(nodeMetric.usage.memory);
          totalMemoryUsage += memoryUsage;
        }
      });

      const reservedCPU = totalCPUCapacity - totalCPUAllocatable;
      const reservedMemory = totalMemoryCapacity - totalMemoryAllocatable;

      const reservedCPUPercentage = (reservedCPU / totalCPUCapacity) * 100;
      const reservedMemoryPercentage = (reservedMemory / totalMemoryCapacity) * 100;

      const usagePercentageAllocatable = (totalCPUUsage / totalCPUAllocatable) * 100;
      const usagePercentageMemoryAllocatable = (totalMemoryUsage / totalMemoryAllocatable) * 100;

      const usedPodsPercentage = (listPodForAllNamespaces.items.length / totalCapacityPods) * 100;

      return {
        name: kubeConfig.getCurrentContext(),
        providers: getProviders(versionInfo, nodes),
        kubernetesVersion: versionInfo.gitVersion,
        architecture: versionInfo.platform,
        nodeCount: nodes.items.length,
        capacity: [
          {
            type: "CPU",
            resourcesStats: [
              {
                percentageValue: Number(reservedCPUPercentage.toFixed(2)),
                type: "Reserved",
                capacityUnit: "Cores",
                usedValue: Number(reservedCPU.toFixed(2)),
                maxUsedValue: Number(totalCPUCapacity.toFixed(2)),
              },
              {
                percentageValue: Number(usagePercentageAllocatable.toFixed(2)),
                type: "Used",
                capacityUnit: "Cores",
                usedValue: Number(totalCPUUsage.toFixed(2)),
                maxUsedValue: Number(totalCPUAllocatable.toFixed(2)),
              },
            ],
          },
          {
            type: "Memory",
            resourcesStats: [
              {
                percentageValue: Number(reservedMemoryPercentage.toFixed(2)),
                type: "Reserved",
                capacityUnit: "GiB",
                usedValue: Number(reservedMemory.toFixed(2)),
                maxUsedValue: Number(totalMemoryCapacity.toFixed(2)),
              },
              {
                percentageValue: Number(usagePercentageMemoryAllocatable.toFixed(2)),
                type: "Used",
                capacityUnit: "GiB",
                usedValue: Number(totalMemoryUsage.toFixed(2)),
                maxUsedValue: Number(totalMemoryAllocatable.toFixed(2)),
              },
            ],
          },
          {
            type: "Pods",
            resourcesStats: [
              {
                percentageValue: Number(usedPodsPercentage.toFixed(2)),
                type: "Used",
                usedValue: listPodForAllNamespaces.items.length,
                maxUsedValue: totalCapacityPods,
              },
            ],
          },
        ],
      };
    } catch (error) {
      logger.error(error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while fetching Kubernetes cluster",
        cause: error,
      });
    }
  }),
  getClusterResourceCounts: permissionRequiredProcedure
    .requiresPermission("admin")
    .query(async (): Promise<ClusterResourceCount[]> => {
      const kubeConfig = new k8s.KubeConfig();
      kubeConfig.loadFromDefault();

      const coreApi = kubeConfig.makeApiClient(CoreV1Api);
      const networkingApi = kubeConfig.makeApiClient(NetworkingV1Api);

      try {
        const pods = await coreApi.listPodForAllNamespaces();
        const podCount = pods.items.length;

        const ingresses = await networkingApi.listIngressForAllNamespaces();
        const ingressCount = ingresses.items.length;

        const services = await coreApi.listServiceForAllNamespaces();
        const serviceCount = services.items.length;

        const configMaps = await coreApi.listConfigMapForAllNamespaces();
        const configMapCount = configMaps.items.length;

        const namespaces = await coreApi.listNamespace();
        const namespaceCount = namespaces.items.length;

        const nodes = await coreApi.listNode();
        const nodeCount = nodes.items.length;

        const secrets = await coreApi.listSecretForAllNamespaces();
        const secretCount = secrets.items.length;

        const volumes = await coreApi.listPersistentVolumeClaimForAllNamespaces();
        const volumeCount = volumes.items.length;

        return [
          {
            label: "nodes",
            count: nodeCount,
          },
          {
            label: "namespaces",
            count: namespaceCount,
          },
          {
            label: "ingresses",
            count: ingressCount,
          },
          {
            label: "services",
            count: serviceCount,
          },
          {
            label: "pods",
            count: podCount,
          },
          {
            label: "secrets",
            count: secretCount,
          },
          {
            label: "configmaps",
            count: configMapCount,
          },
          {
            label: "volumes",
            count: volumeCount,
          },
        ];
      } catch (error) {
        logger.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching Kubernetes resources count",
          cause: error,
        });
      }
    }),
});

function getProviders(versionInfo: VersionInfo, nodes: V1NodeList) {
  const providers = new Set<string>();

  if (versionInfo.gitVersion.includes("k3s")) providers.add("k3s");
  if (versionInfo.gitVersion.includes("gke")) providers.add("GKE");
  if (versionInfo.gitVersion.includes("eks")) providers.add("EKS");
  if (versionInfo.gitVersion.includes("aks")) providers.add("AKS");

  nodes.items.forEach((node) => {
    const nodeProviderLabel =
      node.metadata?.labels?.["node.kubernetes.io/instance-type"] ?? node.metadata?.labels?.provider ?? "";
    if (nodeProviderLabel.includes("aws")) providers.add("EKS");
    if (nodeProviderLabel.includes("azure")) providers.add("AKS");
    if (nodeProviderLabel.includes("gce")) providers.add("GKE");
    if (nodeProviderLabel.includes("k3s")) providers.add("k3s");
  });

  return Array.from(providers).join(", ");
}
