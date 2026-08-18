import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";

import type { ContainerState, DockerContainerTarget, Port } from "@homarr/docker";
import { DockerSingleton } from "@homarr/docker";
import {
  dockerContainersRequestHandler,
  findDockerContainerAsync,
  getContainerLogsAsync,
  getDockerEndpointsAsync,
  hasDockerEndpointCapability,
  streamContainerLogsAsync,
} from "@homarr/request-handler/docker";

import { dockerMiddleware } from "../../middlewares/docker";
import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";
import { getDockerReconciliationAsync, getDockerServiceHealthAsync } from "./docker-reconciliation";

const dockerContainerTargetSchema = z.object({
  endpointId: z.string().min(1),
  id: z.string().min(1),
});
const dockerContainerTargetsSchema = z.array(dockerContainerTargetSchema).min(1).max(100);

export const dockerRouter = createTRPCRouter({
  reconcileServices: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Reconcile Docker container inventory with Homarr integrations and apps, including URL matches and recommended setup or repair actions. Requires admin permission.",
      },
    })
    .concat(dockerMiddleware())
    .query(async ({ ctx }) => await getDockerReconciliationAsync(ctx.db)),
  getServiceHealth: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get Docker endpoint and discovered-service health projected across Docker, integration, app, and widget setup layers. Requires admin permission.",
      },
    })
    .concat(dockerMiddleware())
    .query(async ({ ctx }) => await getDockerServiceHealthAsync(ctx.db)),
  refreshInventory: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Invalidate the cached Docker inventory so the next Docker query performs a fresh user-requested discovery. Requires admin permission.",
      },
    })
    .concat(dockerMiddleware())
    .mutation(() => {
      DockerSingleton.reset();
      dockerContainersRequestHandler.invalidateCache();
    }),
  getContainers: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description: "List all Docker containers with their state, image, CPU/memory usage, and ports",
      },
    })
    .concat(dockerMiddleware())
    .query(async () => {
      const innerHandler = dockerContainersRequestHandler.handler({});
      const result = await innerHandler.getDataAsync();

      const { data, timestamp } = result;

      return {
        containers: data.containers satisfies DockerContainer[],
        endpoints: data.endpoints,
        timestamp,
      };
    }),
  getEndpoints: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description: "List configured Docker endpoints with their availability and capabilities",
      },
    })
    .concat(dockerMiddleware())
    .query(async () => getDockerEndpointsAsync()),
  startAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description: "Start Docker containers. REQUIRED: targets (endpointId and id pairs from docker_getContainers)",
      },
    })
    .concat(dockerMiddleware())
    .input(z.object({ targets: dockerContainerTargetsSchema }))
    .mutation(async ({ input }) => {
      return await performDockerContainerActionsAsync(input.targets, "start");
    }),
  stopAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description: "Stop Docker containers. REQUIRED: targets (endpointId and id pairs from docker_getContainers)",
      },
    })
    .concat(dockerMiddleware())
    .input(z.object({ targets: dockerContainerTargetsSchema }))
    .mutation(async ({ input }) => {
      return await performDockerContainerActionsAsync(input.targets, "stop");
    }),
  restartAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description: "Restart Docker containers. REQUIRED: targets (endpointId and id pairs from docker_getContainers)",
      },
    })
    .concat(dockerMiddleware())
    .input(z.object({ targets: dockerContainerTargetsSchema }))
    .mutation(async ({ input }) => {
      return await performDockerContainerActionsAsync(input.targets, "restart");
    }),
  removeAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Remove/delete Docker containers. REQUIRED: targets (endpointId and id pairs from docker_getContainers)",
      },
    })
    .concat(dockerMiddleware())
    .input(z.object({ targets: dockerContainerTargetsSchema }))
    .mutation(async ({ input }) => {
      return await performDockerContainerActionsAsync(input.targets, "remove");
    }),
  logs: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Fetch logs from a Docker container. REQUIRED: endpointId and id from docker_getContainers. OPTIONAL: tail (number 1-1000, default 200)",
      },
    })
    .concat(dockerMiddleware())
    .input(
      z.object({
        ...dockerContainerTargetSchema.shape,
        tail: z.number().min(1).max(1000).optional(),
      }),
    )
    .query(async ({ input }) => {
      assertDockerEndpointCapability(input.endpointId, "logs");
      const logs = await getContainerLogsAsync(input, input.tail ?? 200);

      if (!logs) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Container not found",
        });
      }

      return {
        logs,
      };
    }),
  subscribeLogs: permissionRequiredProcedure
    .requiresPermission("admin")
    .concat(dockerMiddleware())
    .input(
      z.object({
        ...dockerContainerTargetSchema.shape,
        tail: z.number().min(1).max(1000).optional(),
      }),
    )
    .subscription(({ input }) => {
      assertDockerEndpointCapability(input.endpointId, "logs");
      return observable<string>((emit) => {
        let cleanupFn: (() => void) | undefined;
        let isSubscribed = true;

        const initializeStreamAsync = async () => {
          try {
            cleanupFn = await streamContainerLogsAsync(
              input,
              input.tail ?? 200,
              (data) => {
                if (isSubscribed) {
                  emit.next(data);
                }
              },
              (err) => {
                if (isSubscribed) {
                  emit.error(
                    new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: err.message,
                    }),
                  );
                }
              },
            );
          } catch (err) {
            if (isSubscribed) {
              emit.error(
                new TRPCError({
                  code: "NOT_FOUND",
                  message: err instanceof Error ? err.message : "Container not found",
                }),
              );
            }
          }
        };

        void initializeStreamAsync();

        return () => {
          isSubscribed = false;
          cleanupFn?.();
        };
      });
    }),
});

type DockerContainerAction = "start" | "stop" | "restart" | "remove";

export const performDockerContainerActionsAsync = async (
  targets: DockerContainerTarget[],
  action: DockerContainerAction,
) =>
  await Promise.all(
    targets.map(async (target) => {
      try {
        const capability = action === "remove" ? "remove" : "lifecycle";
        if (!hasDockerEndpointCapability(target.endpointId, capability)) {
          return { target, success: false as const, error: `Endpoint does not permit ${capability} actions` };
        }
        const container = await findDockerContainerAsync(target, capability);
        if (!container) return { target, success: false as const, error: "Container not found" };

        if (action === "start") await container.start();
        else if (action === "stop") await container.stop();
        else if (action === "restart") await container.restart();
        else await container.remove();
        return { target, success: true as const };
      } catch (error) {
        return {
          target,
          success: false as const,
          error: error instanceof Error ? error.message : "Docker action failed",
        };
      }
    }),
  );

const assertDockerEndpointCapability = (
  endpointId: string,
  capability: "inventory" | "logs" | "lifecycle" | "remove",
) => {
  if (hasDockerEndpointCapability(endpointId, capability)) return;
  throw new TRPCError({ code: "FORBIDDEN", message: `Docker endpoint does not permit ${capability} access` });
};

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
