import * as k8s from "@kubernetes/client-node";
import { TRPCError } from "@trpc/server";

import { KubernetesNode, KubernetesNodeState } from "@homarr/definitions";
import { logger } from "@homarr/log";

import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";

export const kubernetesRouter = createTRPCRouter({
  getNodes: permissionRequiredProcedure.requiresPermission("admin").query(async (): Promise<KubernetesNode[]> => {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    try {
      const response = await k8sApi.listNode();
      return response.items.map((node) => {
        // Extract node name
        const name = node.metadata?.name || "unknown";

        // Determine node readiness status
        const readyCondition = node.status?.conditions?.find((condition) => condition.type === "Ready");
        const status: KubernetesNodeState = readyCondition?.status === "True" ? "Ready" : "NotReady";

        // Extract CPU cores
        const cpuRaw = node.status?.capacity?.cpu || "0";
        const cpuCores = cpuRaw.includes("m") ? parseInt(cpuRaw) / 1000 : parseInt(cpuRaw);

        // Extract and convert RAM (from Ki to GB)
        const memoryRaw = node.status?.capacity?.memory || "0";
        const memoryKi = parseInt(memoryRaw.replace("Ki", "")) || 0;
        const ramGB = memoryKi / 1024 / 1024; // Convert KiB to GiB

        // Extract Kubernetes version (from kubelet version)
        const kubeletVersion = node.status?.nodeInfo?.kubeletVersion || "unknown";
        const kubernetesVersion = kubeletVersion.startsWith("v") ? kubeletVersion.substring(1) : kubeletVersion;

        // Extract agent version (additional information if available)
        const agentVersion = node.status?.nodeInfo?.containerRuntimeVersion || "unknown";

        // Extract the last heartbeat time
        const lastHeartbeatTime = readyCondition?.lastHeartbeatTime || "unknown";

        return {
          name,
          status,
          ramGB: parseFloat(ramGB.toFixed(2)), // Round to 2 decimal places
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
});
