import type { V1HTTPIngressPath, V1Ingress, V1IngressRule, V1NodeList, VersionInfo } from "@kubernetes/client-node";
import * as k8s from "@kubernetes/client-node";
import { TRPCError } from "@trpc/server";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type {
  ClusterResourceCount,
  KubernetesBaseResource,
  KubernetesCluster,
  KubernetesIngress,
  KubernetesIngressPath,
  KubernetesIngressRuleAndPath,
  KubernetesNamespace,
  KubernetesNamespaceState,
  KubernetesNode,
  KubernetesNodeState,
  KubernetesPod,
  KubernetesSecret,
  KubernetesService,
  KubernetesVolume,
} from "@homarr/definitions";
import { logger } from "@homarr/log";

import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";
import { KubernetesClient } from "./kubernetes-client";
import { ResourceParserFactory } from "./resource-parser/resource-parser-factory";

dayjs.extend(relativeTime);

export const kubernetesRouter = createTRPCRouter({
  getNodes: permissionRequiredProcedure.requiresPermission("admin").query(async (): Promise<KubernetesNode[]> => {
    const { coreApi, metricsApi } = KubernetesClient.getInstance();

    try {
      const nodes = await coreApi.listNode();
      const nodeMetricsClient = await metricsApi.getNodeMetrics();

      const cpuParser = ResourceParserFactory.getParser("cpu");
      const MemoryParser = ResourceParserFactory.getParser("memory");

      return nodes.items.map((node) => {
        const name = node.metadata?.name ?? "unknown";

        const readyCondition = node.status?.conditions?.find((condition) => condition.type === "Ready");
        const status: KubernetesNodeState = readyCondition?.status === "True" ? "Ready" : "NotReady";

        const creationTimestamp = node.metadata?.creationTimestamp ?? "unknown";

        const cpuAllocatable = cpuParser.parse(node.status?.allocatable?.cpu ?? "0");

        const memoryAllocatable = MemoryParser.parse(node.status?.allocatable?.memory ?? "0");

        let cpuUsage = 0;
        let memoryUsage = 0;

        const nodeMetric = nodeMetricsClient.items.find((metric) => metric.metadata.name === name);
        if (nodeMetric) {
          cpuUsage += cpuParser.parse(nodeMetric.usage.cpu);
          memoryUsage += MemoryParser.parse(nodeMetric.usage.memory);
        }

        const usagePercentageCPUAllocatable = (cpuUsage / cpuAllocatable) * 100;
        const usagePercentageMemoryAllocatable = (memoryUsage / memoryAllocatable) * 100;

        return {
          name,
          status,
          allocatableCpuPercentage: Number(usagePercentageCPUAllocatable.toFixed(2)),
          allocatableRamPercentage: Number(usagePercentageMemoryAllocatable.toFixed(2)),
          podsCount: Number(node.status?.capacity?.pods),
          operatingSystem: node.status?.nodeInfo?.operatingSystem,
          architecture: node.status?.nodeInfo?.architecture,
          kubernetesVersion: node.status?.nodeInfo?.kubeletVersion,
          creationTimestamp: dayjs().to(dayjs(creationTimestamp)),
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
    const { coreApi, metricsApi, versionApi, kubeConfig } = KubernetesClient.getInstance();

    try {
      const versionInfo = await versionApi.getCode();
      const nodes = await coreApi.listNode();
      const nodeMetricsClient = await metricsApi.getNodeMetrics();
      const listPodForAllNamespaces = await coreApi.listPodForAllNamespaces();

      let totalCPUCapacity = 0;
      let totalCPUAllocatable = 0;
      let totalCPUUsage = 0;

      let totalMemoryCapacity = 0;
      let totalMemoryAllocatable = 0;
      let totalMemoryUsage = 0;

      let totalCapacityPods = 0;

      const cpuParser = ResourceParserFactory.getParser("cpu");
      const MemoryParser = ResourceParserFactory.getParser("memory");

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
      const { coreApi, networkingApi } = KubernetesClient.getInstance();

      try {
        const [pods, ingresses, services, configMaps, namespaces, nodes, secrets, volumes] = await Promise.all([
          coreApi.listPodForAllNamespaces(),
          networkingApi.listIngressForAllNamespaces(),
          coreApi.listServiceForAllNamespaces(),
          coreApi.listConfigMapForAllNamespaces(),
          coreApi.listNamespace(),
          coreApi.listNode(),
          coreApi.listSecretForAllNamespaces(),
          coreApi.listPersistentVolumeClaimForAllNamespaces(),
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
      } catch (error) {
        logger.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching Kubernetes resources count",
          cause: error,
        });
      }
    }),
  getNamespaces: permissionRequiredProcedure
    .requiresPermission("admin")
    .query(async (): Promise<KubernetesNamespace[]> => {
      const { coreApi } = KubernetesClient.getInstance();

      try {
        const namespaces = await coreApi.listNamespace();

        return namespaces.items.map((namespace) => {
          return {
            status: namespace.status?.phase as KubernetesNamespaceState,
            name: namespace.metadata?.name ?? "unknown",
            creationTimestamp: dayjs().to(dayjs(namespace.metadata?.creationTimestamp)),
          } satisfies KubernetesNamespace;
        });
      } catch (error) {
        logger.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching Kubernetes namespaces",
          cause: error,
        });
      }
    }),
  getIngresses: permissionRequiredProcedure
    .requiresPermission("admin")
    .query(async (): Promise<KubernetesIngress[]> => {
      const { networkingApi } = KubernetesClient.getInstance();
      try {
        const ingresses = await networkingApi.listIngressForAllNamespaces();

        const mapIngress = (ingress: V1Ingress): KubernetesIngress => {
          return {
            name: ingress.metadata?.name ?? "",
            namespace: ingress.metadata?.namespace ?? "",
            className: ingress.spec?.ingressClassName ?? "",
            rulesAndPaths: getIngressRulesAndPaths(ingress.spec?.rules ?? []),
            creationTimestamp: dayjs().to(dayjs(ingress.metadata?.creationTimestamp)),
          };
        };

        const getIngressRulesAndPaths = (rules: V1IngressRule[] = []): KubernetesIngressRuleAndPath[] => {
          return rules.map((rule) => ({
            host: rule.host ?? "",
            paths: getPaths(rule.http?.paths ?? []),
          }));
        };

        const getPaths = (paths: V1HTTPIngressPath[] = []): KubernetesIngressPath[] => {
          return paths.map((path) => ({
            serviceName: path.backend.service?.name ?? "",
            port: path.backend.service?.port?.number ?? 0,
          }));
        };

        return ingresses.items.map(mapIngress);
      } catch (error) {
        logger.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching Kubernetes ingresses",
          cause: error,
        });
      }
    }),
  getServices: permissionRequiredProcedure.requiresPermission("admin").query(async (): Promise<KubernetesService[]> => {
    const { coreApi } = KubernetesClient.getInstance();

    try {
      const services = await coreApi.listServiceForAllNamespaces();

      return services.items.map((service) => {
        return {
          name: service.metadata?.name ?? "unknown",
          namespace: service.metadata?.namespace ?? "",
          type: service.spec?.type ?? "",
          ports: service.spec?.ports?.map(({ port, protocol }) => `${port}/${protocol}`),
          targetPorts: service.spec?.ports?.map(({ targetPort }) => `${targetPort}`),
          clusterIP: service.spec?.clusterIP ?? "",
          creationTimestamp: dayjs().to(dayjs(service.metadata?.creationTimestamp)),
        };
      });
    } catch (error) {
      logger.error(error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while fetching Kubernetes services",
        cause: error,
      });
    }
  }),
  getPods: permissionRequiredProcedure.requiresPermission("admin").query(async (): Promise<KubernetesPod[]> => {
    const { coreApi, kubeConfig } = KubernetesClient.getInstance();
    try {
      const podsResp = await coreApi.listPodForAllNamespaces();

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
              const ownerType = await getOwnerKind(kubeConfig, owner, pod.metadata?.namespace ?? "");
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
          creationTimestamp: dayjs().to(dayjs(pod.metadata?.creationTimestamp)),
        });
      }

      return pods;
    } catch (error) {
      logger.error(error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while fetching Kubernetes pods",
        cause: error,
      });
    }
  }),
  getSecrets: permissionRequiredProcedure.requiresPermission("admin").query(async (): Promise<KubernetesSecret[]> => {
    const { coreApi } = KubernetesClient.getInstance();
    try {
      const secrets = await coreApi.listSecretForAllNamespaces();

      return secrets.items.map((secret) => {
        return {
          name: secret.metadata?.name ?? "unknown",
          namespace: secret.metadata?.namespace ?? "unknown",
          type: secret.type ?? "unknown",
          creationTimestamp: dayjs().to(dayjs(secret.metadata?.creationTimestamp)),
        };
      });
    } catch (error) {
      logger.error(error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while fetching Kubernetes secrets",
        cause: error,
      });
    }
  }),
  getConfigMaps: permissionRequiredProcedure
    .requiresPermission("admin")
    .query(async (): Promise<KubernetesBaseResource[]> => {
      const { coreApi } = KubernetesClient.getInstance();

      try {
        const configMaps = await coreApi.listConfigMapForAllNamespaces();

        return configMaps.items.map((configMap) => {
          return {
            name: configMap.metadata?.name ?? "unknown",
            namespace: configMap.metadata?.namespace ?? "unknown",
            creationTimestamp: dayjs().to(dayjs(configMap.metadata?.creationTimestamp)),
          };
        });
      } catch (error) {
        logger.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching Kubernetes ConfigMaps",
          cause: error,
        });
      }
    }),
  getVolumes: permissionRequiredProcedure.requiresPermission("admin").query(async (): Promise<KubernetesVolume[]> => {
    const { coreApi } = KubernetesClient.getInstance();

    try {
      const volumes = await coreApi.listPersistentVolumeClaimForAllNamespaces();

      return volumes.items.map((volume) => {
        return {
          name: volume.metadata?.name ?? "unknown",
          namespace: volume.metadata?.namespace ?? "unknown",
          accessModes: volume.status?.accessModes?.map((accessMode) => accessMode) ?? [],
          storage: volume.status?.capacity?.storage ?? "",
          storageClassName: volume.spec?.storageClassName ?? "",
          volumeMode: volume.spec?.volumeMode ?? "",
          volumeName: volume.spec?.volumeName ?? "",
          status: volume.status?.phase ?? "",
          creationTimestamp: dayjs().to(dayjs(volume.metadata?.creationTimestamp)),
        };
      });
    } catch (error) {
      logger.error(error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while fetching Kubernetes Volumes",
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

async function getOwnerKind(
  kubeConfig: k8s.KubeConfig,
  ownerRef: k8s.V1OwnerReference,
  namespace: string,
): Promise<string | null> {
  const { kind, name } = ownerRef;

  if (kind === "ReplicaSet") {
    const appsApi = kubeConfig.makeApiClient(k8s.AppsV1Api);
    try {
      const rsResp = await appsApi.readNamespacedReplicaSet({
        name,
        namespace,
      });

      if (rsResp.metadata?.ownerReferences) {
        for (const rsOwner of rsResp.metadata.ownerReferences) {
          if (rsOwner.kind === "Deployment") {
            return "Deployment";
          }
          const parentKind = await getOwnerKind(kubeConfig, rsOwner, namespace);
          if (parentKind) return parentKind;
        }
      }
      return "ReplicaSet";
    } catch (error) {
      logger.error("Error reading ReplicaSet:", error);
      return null;
    }
  }

  if (["Deployment", "StatefulSet", "DaemonSet"].includes(kind)) {
    return kind;
  }

  return null;
}
