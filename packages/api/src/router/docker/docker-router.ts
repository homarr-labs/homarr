import type Docker from "dockerode";

import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema/sqlite";
import type { DockerContainerState } from "@homarr/definitions";
import { createCacheChannel } from "@homarr/redis";

import { createTRPCRouter, publicProcedure } from "../../trpc";
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
});

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
