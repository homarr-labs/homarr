import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import type { ContainerState, Port } from "@homarr/docker";

import { authenticatedProcedure, sourceProjectionMeta } from "../procedure";
import type { SourceProcedureDescriptor } from "../procedure";
import {
  assertDockerEndpointCapability,
  createDockerLogIterator,
  getDockerReconciliationAsync,
  getDockerServiceHealthAsync,
  performDockerContainerActionsAsync,
} from "./-docker/helpers";
import type { DockerProcedureResources } from "./-docker/resources";

export type { DockerProcedureResources } from "./-docker/resources";

export const dockerImplementedPaths = [
  "docker.reconcileServices",
  "docker.getServiceHealth",
  "docker.refreshInventory",
  "docker.getContainers",
  "docker.getEndpoints",
  "docker.startAll",
  "docker.stopAll",
  "docker.restartAll",
  "docker.removeAll",
  "docker.logs",
  "docker.subscribeLogs",
] as const;

export const dockerPendingPaths = [] as const;

export const dockerBindingHolds = [
  "Current admin authority and ENABLE_DOCKER/demo configuration must come from the owned backend context and host configuration.",
  "Docker endpoint descriptors, TLS credentials, client ownership and capability checks must be bound to the same owned Docker service; no ambient singleton is installed.",
  "Inventory cache, polling/stat baselines, physical icon reads, demo data and invalidation effects must be bound to the source-equivalent owned request-handler runtime.",
  "Log stream cleanup, late initialization, request abort, transport cancellation and host disposal must be joined and reviewed before mounting subscribeLogs.",
] as const;

const dockerContainerTargetSchema = z.object({
  endpointId: z.string().min(1),
  id: z.string().min(1),
});
const dockerContainerTargetsSchema = z.array(dockerContainerTargetSchema).min(1).max(100);

const normalizeGetContainersInput = (input: { endpointIds?: string[] } | undefined) => {
  if (!input?.endpointIds || input.endpointIds.length === 0) return {};
  return input;
};

function dockerProcedure(
  resources: DockerProcedureResources,
  descriptor: SourceProcedureDescriptor & {
    readonly access: { readonly kind: "permission"; readonly permission: "admin" };
  },
) {
  return authenticatedProcedure(descriptor).use(({ context, next }) => {
    if (!resources.enableDocker && !context.demo.enabled) {
      throw new ORPCError("NOT_FOUND", { message: "Docker route is not available" });
    }
    return next();
  });
}

export function createDockerProcedures(resources: DockerProcedureResources) {
  return {
    reconcileServices: dockerProcedure(resources, {
      path: "docker.reconcileServices",
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Reconcile Docker container inventory with Homarr integrations and apps, including URL matches and recommended setup or repair actions. Requires admin permission.",
          },
        }),
      )
      .handler(async ({ context }) => await getDockerReconciliationAsync(resources, context.db)),
    getServiceHealth: dockerProcedure(resources, {
      path: "docker.getServiceHealth",
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Get Docker endpoint and discovered-service health projected across Docker, integration, app, and widget setup layers. Requires admin permission.",
          },
        }),
      )
      .handler(async ({ context }) => await getDockerServiceHealthAsync(resources, context.db)),
    refreshInventory: dockerProcedure(resources, {
      path: "docker.refreshInventory",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Invalidate the cached Docker inventory so the next Docker query performs a fresh user-requested discovery. Requires admin permission.",
          },
        }),
      )
      .handler(() => {
        resources.singleton.reset();
        resources.dockerContainersRequestHandler.invalidateCache();
      }),
    getContainers: dockerProcedure(resources, {
      path: "docker.getContainers",
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "List Docker containers with their state, image, CPU/memory usage, and ports. Optionally filter by endpoint IDs; omitted or empty means all endpoints.",
          },
        }),
      )
      .input(z.object({ endpointIds: z.array(z.string().min(1)).max(100).optional() }).optional())
      .handler(async ({ input }) => {
        const innerHandler = resources.dockerContainersRequestHandler.handler(normalizeGetContainersInput(input));
        const { data, timestamp } = await innerHandler.getDataAsync();
        return {
          containers: data.containers satisfies DockerContainer[],
          endpoints: data.endpoints,
          timestamp,
        };
      }),
    getEndpoints: dockerProcedure(resources, {
      path: "docker.getEndpoints",
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description: "List configured Docker endpoints with their availability and capabilities",
          },
        }),
      )
      .handler(async () => resources.getDockerEndpointsAsync()),
    startAll: dockerProcedure(resources, {
      path: "docker.startAll",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Start Docker containers. REQUIRED: targets (endpointId and id pairs from docker_getContainers)",
          },
        }),
      )
      .input(z.object({ targets: dockerContainerTargetsSchema }))
      .handler(async ({ input }) => await performDockerContainerActionsAsync(resources, input.targets, "start")),
    stopAll: dockerProcedure(resources, {
      path: "docker.stopAll",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Stop Docker containers. REQUIRED: targets (endpointId and id pairs from docker_getContainers)",
          },
        }),
      )
      .input(z.object({ targets: dockerContainerTargetsSchema }))
      .handler(async ({ input }) => await performDockerContainerActionsAsync(resources, input.targets, "stop")),
    restartAll: dockerProcedure(resources, {
      path: "docker.restartAll",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Restart Docker containers. REQUIRED: targets (endpointId and id pairs from docker_getContainers)",
          },
        }),
      )
      .input(z.object({ targets: dockerContainerTargetsSchema }))
      .handler(async ({ input }) => await performDockerContainerActionsAsync(resources, input.targets, "restart")),
    removeAll: dockerProcedure(resources, {
      path: "docker.removeAll",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Remove/delete Docker containers. REQUIRED: targets (endpointId and id pairs from docker_getContainers)",
          },
        }),
      )
      .input(z.object({ targets: dockerContainerTargetsSchema }))
      .handler(async ({ input }) => await performDockerContainerActionsAsync(resources, input.targets, "remove")),
    logs: dockerProcedure(resources, {
      path: "docker.logs",
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Fetch logs from a Docker container. REQUIRED: endpointId and id from docker_getContainers. OPTIONAL: tail (number 1-1000, default 200)",
          },
        }),
      )
      .input(
        z.object({
          ...dockerContainerTargetSchema.shape,
          tail: z.number().min(1).max(1000).optional(),
        }),
      )
      .handler(async ({ input }) => {
        assertDockerEndpointCapability(resources, input.endpointId, "logs");
        const logs = await resources.getContainerLogsAsync(input, input.tail ?? 200);
        if (!logs) throw new ORPCError("NOT_FOUND", { message: "Container not found" });
        return { logs };
      }),
    subscribeLogs: dockerProcedure(resources, {
      path: "docker.subscribeLogs",
      kind: "subscription",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(
        z.object({
          ...dockerContainerTargetSchema.shape,
          tail: z.number().min(1).max(1000).optional(),
        }),
      )
      .handler(({ input, context }) => {
        assertDockerEndpointCapability(resources, input.endpointId, "logs");
        return createDockerLogIterator(resources, context, input, input.tail ?? 200);
      }),
  };
}

interface DockerContainer {
  endpointId: string;
  endpointName: string;
  resourceId: string;
  name: string;
  id: string;
  host: string;
  state: ContainerState;
  image: string;
  ports: Port[] | undefined;
  iconUrl: string | null;
  cpuUsage: number;
  memoryUsage: number;
}
