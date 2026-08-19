import { TRPCError } from "@trpc/server";

import type { KubernetesNode, KubernetesNodeState } from "@homarr/definitions";

import { kubernetesMiddleware } from "../../../middlewares/kubernetes";
import { createTRPCRouter, permissionRequiredProcedure } from "../../../trpc";
import { getKubernetesClient, kubernetesContextInput } from "../kubernetes-context";
import { calculateResourcePercentage } from "../resource-percentage";
import { CpuResourceParser } from "../resource-parser/cpu-resource-parser";
import { MemoryResourceParser } from "../resource-parser/memory-resource-parser";

export const nodesRouter = createTRPCRouter({
  getNodes: permissionRequiredProcedure
    .requiresPermission("admin")
    .concat(kubernetesMiddleware())
    .input(kubernetesContextInput)
    .query(async ({ input }): Promise<KubernetesNode[]> => {
      const client = getKubernetesClient(input.contextId);
      const { coreApi } = client;

      try {
        const [nodes, nodeMetricsClient] = await Promise.all([
          coreApi.listNode(),
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

          const usagePercentageCPUAllocatable = nodeMetric
            ? calculateResourcePercentage(cpuUsage, cpuAllocatable)
            : null;
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
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching Kubernetes nodes",
          cause: error,
        });
      }
    }),
});
