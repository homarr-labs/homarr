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
    .concat(dockerMiddleware())
    .query(async () => {
      const innerHandler = dockerContainersRequestHandler.handler({});
      const result = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

      const { data, timestamp } = result;

      return {
        containers: data satisfies DockerContainer[],
        timestamp,
      };
    }),
  subscribeContainers: permissionRequiredProcedure
    .requiresPermission("admin")
    .concat(dockerMiddleware())
    .subscription(() => {
      return observable<DockerContainer[]>((emit) => {
        const innerHandler = dockerContainersRequestHandler.handler({});
        const unsubscribe = innerHandler.subscribe((data) => {
          emit.next(data);
        });

        return unsubscribe;
      });
    }),
  invalidate: permissionRequiredProcedure
    .requiresPermission("admin")
    .concat(dockerMiddleware())
    .mutation(async () => {
      const innerHandler = dockerContainersRequestHandler.handler({});
      await innerHandler.invalidateAsync();
    }),
  startAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .concat(dockerMiddleware())
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await Promise.allSettled(
        input.ids.map(async (id) => {
          const container = await getContainerOrThrowAsync(id);
          await container.start();
        }),
      );

      const innerHandler = dockerContainersRequestHandler.handler({});
      await innerHandler.invalidateAsync();
    }),
  stopAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .concat(dockerMiddleware())
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await Promise.allSettled(
        input.ids.map(async (id) => {
          const container = await getContainerOrThrowAsync(id);
          await container.stop();
        }),
      );

      const innerHandler = dockerContainersRequestHandler.handler({});
      await innerHandler.invalidateAsync();
    }),
  restartAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .concat(dockerMiddleware())
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await Promise.allSettled(
        input.ids.map(async (id) => {
          const container = await getContainerOrThrowAsync(id);
          await container.restart();
        }),
      );

      const innerHandler = dockerContainersRequestHandler.handler({});
      await innerHandler.invalidateAsync();
    }),
  removeAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .concat(dockerMiddleware())
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await Promise.allSettled(
        input.ids.map(async (id) => {
          const container = await getContainerOrThrowAsync(id);
          await container.remove();
        }),
      );

      const innerHandler = dockerContainersRequestHandler.handler({});
      await innerHandler.invalidateAsync();
    }),
  logs: permissionRequiredProcedure
    .requiresPermission("admin")
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

        const initializeStream = async () => {
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

        void initializeStream();

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
  state: ContainerState;
  image: string;
  ports: Port[];
  iconUrl: string | null;
  cpuUsage: number;
  memoryUsage: number;
}
