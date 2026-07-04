import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";

import type { Container, ContainerState, Docker, Port } from "@homarr/docker";
import { DockerSingleton } from "@homarr/docker";
import {
  dockerContainersRequestHandler,
  getContainerLogsAsync,
  streamContainerLogsAsync,
} from "@homarr/request-handler/docker";

import { dockerMiddleware } from "../../middlewares/docker";
import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";

export const dockerRouter = createTRPCRouter({
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
        containers: data satisfies DockerContainer[],
        timestamp,
      };
    }),
  startAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description: "Start Docker containers. REQUIRED: ids (array of container ID strings from docker_getContainers)",
      },
    })
    .concat(dockerMiddleware())
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await Promise.allSettled(
        input.ids.map(async (id) => {
          const container = await getContainerOrThrowAsync(id);
          await container.start();
        }),
      );
    }),
  stopAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description: "Stop Docker containers. REQUIRED: ids (array of container ID strings from docker_getContainers)",
      },
    })
    .concat(dockerMiddleware())
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await Promise.allSettled(
        input.ids.map(async (id) => {
          const container = await getContainerOrThrowAsync(id);
          await container.stop();
        }),
      );
    }),
  restartAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Restart Docker containers. REQUIRED: ids (array of container ID strings from docker_getContainers)",
      },
    })
    .concat(dockerMiddleware())
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await Promise.allSettled(
        input.ids.map(async (id) => {
          const container = await getContainerOrThrowAsync(id);
          await container.restart();
        }),
      );
    }),
  removeAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Remove/delete Docker containers. REQUIRED: ids (array of container ID strings from docker_getContainers)",
      },
    })
    .concat(dockerMiddleware())
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await Promise.allSettled(
        input.ids.map(async (id) => {
          const container = await getContainerOrThrowAsync(id);
          await container.remove();
        }),
      );
    }),
  logs: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Fetch logs from a Docker container. REQUIRED: id (container ID from docker_getContainers). OPTIONAL: tail (number 1-1000, default 200)",
      },
    })
    .concat(dockerMiddleware())
    .input(
      z.object({
        id: z.string(),
        tail: z.number().min(1).max(1000).optional(),
      }),
    )
    .query(async ({ input }) => {
      const logs = await getContainerLogsAsync(input.id, input.tail ?? 200);

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
        id: z.string(),
        tail: z.number().min(1).max(1000).optional(),
      }),
    )
    .subscription(({ input }) => {
      return observable<string>((emit) => {
        let cleanupFn: (() => void) | undefined;
        let isSubscribed = true;

        const initializeStreamAsync = async () => {
          try {
            cleanupFn = await streamContainerLogsAsync(
              input.id,
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

const getContainerOrDefaultAsync = async (instance: Docker, id: string) => {
  const container = instance.getContainer(id);

  return await new Promise<Container | null>((resolve) => {
    container.inspect((err, data) => {
      if (err || !data) {
        resolve(null);
      } else {
        resolve(container);
      }
    });
  });
};

const getContainerOrThrowAsync = async (id: string) => {
  const dockerInstances = DockerSingleton.getInstances();
  const containers = await Promise.all(dockerInstances.map(({ instance }) => getContainerOrDefaultAsync(instance, id)));
  const foundContainer = containers.find((container) => container) ?? null;

  if (!foundContainer) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Container not found",
    });
  }

  return foundContainer;
};

interface DockerContainer {
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
