import { TRPCError } from "@trpc/server";
import type Docker from "dockerode";
import type { Container } from "dockerode";

import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema/sqlite";
import type { DockerContainerState } from "@homarr/definitions";
import { createCacheChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import { createTRPCRouter, permissionRequiredProcedure, publicProcedure } from "../../trpc";
import { DockerSingleton } from "./docker-singleton";

const dockerCache = createCacheChannel<{
  containers: (Docker.ContainerInfo & { instance: string; iconUrl: string | null })[];
}>("docker-containers", 5 * 60 * 1000);

export const dockerRouter = createTRPCRouter({
  getContainers: publicProcedure.query(async () => {
    const { timestamp, data } = await dockerCache.consumeAsync(async () => {
      const dockerInstances = DockerSingleton.getInstance();
      const containers = await Promise.all(
        // Return all the containers of all the instances into only one item
        dockerInstances.map(({ instance, host: key }) =>
          instance.listContainers({ all: true }).then((containers) =>
            containers.map((container) => ({
              ...container,
              instance: key,
            })),
          ),
        ),
      ).then((containers) => containers.flat());

      const extractImage = (container: Docker.ContainerInfo) =>
        container.Image.split("/").at(-1)?.split(":").at(0) ?? "";
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
    });

    return {
      containers: sanitizeContainers(data.containers),
      timestamp,
    };
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
  const dockerInstances = DockerSingleton.getInstance();
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
  state: DockerContainerState;
  image: string;
  ports: Docker.Port[];
  iconUrl: string | null;
}

function sanitizeContainers(
  containers: (Docker.ContainerInfo & { instance: string; iconUrl: string | null })[],
): DockerContainer[] {
  return containers.map((container) => {
    return {
      name: container.Names[0]?.split("/")[1] ?? "Unknown",
      id: container.Id,
      instance: container.instance,
      state: container.State as DockerContainerState,
      image: container.Image,
      ports: container.Ports,
      iconUrl: container.iconUrl,
    };
  });
}
