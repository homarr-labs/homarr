import { TRPCError } from "@trpc/server";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type { KubernetesNode, KubernetesNodeState } from "@homarr/definitions";
import { logger } from "@homarr/log";

import { createTRPCRouter, permissionRequiredProcedure } from "../../../trpc";
import { KubernetesClient } from "../kubernetes-client";
import { ResourceParserFactory } from "../resource-parser/resource-parser-factory";

dayjs.extend(relativeTime);

export const nodesRouter = createTRPCRouter({
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
          allocatableCpuPercentage: Number(usagePercentageCPUAllocatable.toFixed(0)),
          allocatableRamPercentage: Number(usagePercentageMemoryAllocatable.toFixed(0)),
          podsCount: Number(node.status?.capacity?.pods),
          operatingSystem: node.status?.nodeInfo?.operatingSystem,
          architecture: node.status?.nodeInfo?.architecture,
          kubernetesVersion: node.status?.nodeInfo?.kubeletVersion,
          creationTimestamp: dayjs().to(dayjs(creationTimestamp)),
        };
      });
    } catch (error) {
      logger.error("Unable to retrieve nodes", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while fetching Kubernetes nodes",
        cause: error,
      });
    }
  }),
});
