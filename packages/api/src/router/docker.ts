import Docker from "dockerode";

import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema/sqlite";
import type { DockerContainerStatus } from "@homarr/definitions";
import { createCacheChannel } from "@homarr/redis";

import { createTRPCRouter, publicProcedure } from "../trpc";

// ENV DOCKER_HOST: z.string().optional(),
// DOCKER_PORT: z.number().optional(),

interface DockerInstance {
  host: string;
  instance: Docker;
}

class DockerSingleton {
  private static instances: DockerInstance[];

  private createInstances() {
    const instances: DockerInstance[] = [];
    const hostVariable = process.env.DOCKER_HOST;
    const portVariable = process.env.DOCKER_PORT;
    if (hostVariable === undefined || portVariable === undefined) {
      instances.push({ host: "socket", instance: new Docker() });
      return instances;
    }
    const hosts = hostVariable.split(",");
    const ports = portVariable.split(",");

    if (hosts.length !== ports.length) {
      throw new Error("The number of hosts and ports must match");
    }

    hosts.forEach((host, i) => {
      instances.push({
        host: `${host}:${ports[i]}`,
        instance: new Docker({
          host,
          port: parseInt(ports[i] || "", 10),
        }),
      });
      return instances;
    });
    return instances;
  }

  public static findInstance(key: string): DockerInstance | undefined {
    return this.instances.find((instance) => instance.host === key);
  }

  public static getInstance(): DockerInstance[] {
    if (!DockerSingleton.instances) {
      DockerSingleton.instances = new DockerSingleton().createInstances();
    }

    return this.instances;
  }
}

const dockerCache = createCacheChannel<{
  containers: (Docker.ContainerInfo & { instance: string; iconUrl: string | null })[];
}>("/docker", 5 * 60 * 1000);

export const dockerRouter = createTRPCRouter({
  getContainers: publicProcedure.query(async () => {
    // Check if the value already in the cache from redis
    const cachedData = await dockerCache.getAsync();
    const isCacheYoungerThan5Minutes = cachedData?.isFresh;

    console.log(cachedData?.data.containers);

    if (isCacheYoungerThan5Minutes) {
      return {
        containers: sanitizeContainers(cachedData.data.containers),
        timestamp: cachedData.timestamp,
      };
    }
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

    const extractImage = (container: Docker.ContainerInfo) => container.Image.split("/").at(-1)?.split(":").at(0) ?? "";
    const likeQueries = containers.map((container) => like(icons.name, `%${extractImage(container)}%`));
    const dbIcons =
      likeQueries.length >= 1
        ? await db.query.icons.findMany({
            where: or(...likeQueries),
          })
        : [];

    console.log(dbIcons, dbIcons.length, dbIcons.at(0));

    const containersWithIcons = containers.map((container) => ({
      ...container,
      iconUrl:
        dbIcons.find((icon) => {
          const extractedImage = extractImage(container);
          if (!extractedImage) return false;
          return icon.name.toLowerCase().includes(extractedImage.toLowerCase());
        })?.url ?? null,
    }));

    // Only return the name, id, status, image, and ports of each containers from all instances
    const sanitizedContainers = sanitizeContainers(containersWithIcons);

    // Save the data into the cache
    await dockerCache.setAsync({
      containers: containersWithIcons,
    });

    return {
      containers: sanitizedContainers,
      timestamp: new Date(),
    };
  }),
});

export interface DockerContainer {
  name: string;
  id: string;
  state: DockerContainerStatus;
  image: string;
  ports: Docker.Port[];
  iconUrl: string | null;
}

function sanitizeContainers(
  containers: (Docker.ContainerInfo & { instance: string; iconUrl: string | null })[],
): DockerContainer[] {
  return containers.map((container) => {
    console.log(container);
    return {
      name: container.Names[0]?.split("/")[1] || "Unknown",
      id: container.Id,
      instance: container.instance,
      state: container.State as DockerContainerStatus,
      image: container.Image,
      ports: container.Ports,
      iconUrl: container.iconUrl,
    };
  });
}
