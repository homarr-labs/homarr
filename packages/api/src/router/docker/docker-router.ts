import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema";
import type { Container, ContainerInfo, ContainerState, Docker, Port } from "@homarr/docker";
import { DockerSingleton } from "@homarr/docker";
import { logger } from "@homarr/log";
import { createCacheChannel } from "@homarr/redis";

import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";

const dockerCache = createCacheChannel<{
  containers: (ContainerInfo & { instance: string; iconUrl: string | null; cpuUsage: number; memoryUsage: number })[];
}>("docker-containers", 5 * 60 * 1000);

const statsCache = createCacheChannel<Map<string, { totalUsage: number; systemUsage: number }>>(
  "docker-stats",
  5 * 60 * 1000,
);
// const previousStats = new Map<string, { totalUsage: number; systemUsage: number }>();

export const dockerRouter = createTRPCRouter({
  // The first time getContainers runs, there’s no previous CPU usage data, so the percentage will be 0
  getContainers: permissionRequiredProcedure.requiresPermission("admin").query(async () => {
    const result = await dockerCache
      .consumeAsync(async () => {
        const dockerInstances = DockerSingleton.getInstances();
        const containers = await Promise.all(
          // Return all the containers of all the instances into only one item
          dockerInstances.map(({ instance, host: key }) =>
            instance.listContainers({ all: true }).then((containers) =>
              Promise.all(
                containers.map(async (container) => {
                  const stats = await instance.getContainer(container.Id).stats({ stream: false });
                  const statsData = await statsCache.getAsync();
                  const prevStats = statsData?.data.get(container.Id);
                  // const prevStats = previousStats.get(container.Id);
                  const totalUsage = stats.cpu_stats.cpu_usage.total_usage;
                  const systemUsage = stats.cpu_stats.system_cpu_usage;
                  const cpuCount = stats.cpu_stats.online_cpus;

                  let cpuPercent = 0;
                  if (prevStats) {
                    const totalDiff = totalUsage - prevStats.totalUsage;
                    const systemDiff = systemUsage - prevStats.systemUsage;
                    if (systemDiff > 0) {
                      cpuPercent = (totalDiff / systemDiff) * cpuCount * 100;
                    }
                  }

                  // previousStats.set(container.Id, { totalUsage, systemUsage });
                  const newStats = new Map<string, { totalUsage: number; systemUsage: number }>();
                  newStats.set(container.Id, { totalUsage, systemUsage });
                  await statsCache.setAsync(newStats);

                  return {
                    ...container,
                    instance: key,
                    cpuUsage: Math.round(cpuPercent * 100) / 100,
                    memoryUsage: stats.memory_stats.usage,
                  };
                }),
              ),
            ),
          ),
        ).then((containers) => containers.flat());

        const extractImage = (container: ContainerInfo) => container.Image.split("/").at(-1)?.split(":").at(0) ?? "";
        const likeQueries = containers.map((container) => like(icons.name, `%${extractImage(container)}%`));
        const dbIcons =
          likeQueries.length >= 1
            ? await db.query.icons.findMany({
                where: or(...likeQueries),
              })
            : [];

        return {
          containers: containers.map((container) => ({
            ...container,
            iconUrl:
              dbIcons.find((icon) => {
                const extractedImage = extractImage(container);
                if (!extractedImage) return false;
                return icon.name.toLowerCase().includes(extractedImage.toLowerCase());
              })?.url ?? null,
          })),
        };
      })
      .catch((error) => {
        logger.error(error);
        return {
          isError: true,
          error: error as unknown,
        };
      });

    if ("isError" in result) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while fetching the containers",
        cause: result.error,
      });
    }

    const { data, timestamp } = result;

    return {
      containers: sanitizeContainers(data.containers),
      timestamp,
    };
  }),
  invalidate: permissionRequiredProcedure.requiresPermission("admin").mutation(async () => {
    await dockerCache.invalidateAsync();
    return;
  }),
  startAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await Promise.allSettled(
        input.ids.map(async (id) => {
          const container = await getContainerOrThrowAsync(id);
          await container.start();
        }),
      );

      await dockerCache.invalidateAsync();
    }),
  stopAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await Promise.allSettled(
        input.ids.map(async (id) => {
          const container = await getContainerOrThrowAsync(id);
          await container.stop();
        }),
      );

      await dockerCache.invalidateAsync();
    }),
  restartAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await Promise.allSettled(
        input.ids.map(async (id) => {
          const container = await getContainerOrThrowAsync(id);
          await container.restart();
        }),
      );

      await dockerCache.invalidateAsync();
    }),
  removeAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await Promise.allSettled(
        input.ids.map(async (id) => {
          const container = await getContainerOrThrowAsync(id);
          await container.remove();
        }),
      );

      await dockerCache.invalidateAsync();
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
  cpuUsage?: number;
  memoryUsage?: number;
}

function sanitizeContainers(
  containers: (ContainerInfo & { instance: string; iconUrl: string | null; cpuUsage: number; memoryUsage: number })[],
): DockerContainer[] {
  return containers.map((container) => {
    return {
      name: container.Names[0]?.split("/")[1] ?? "Unknown",
      id: container.Id,
      instance: container.instance,
      state: container.State as ContainerState,
      image: container.Image,
      ports: container.Ports,
      iconUrl: container.iconUrl,
      cpuUsage: container.cpuUsage,
      memoryUsage: container.memoryUsage,
    };
  });
}
