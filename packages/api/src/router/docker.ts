import Docker from "dockerode";

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
  containers: (Docker.ContainerInfo & { instance: string })[];
}>("/docker", 5 * 60 * 1000);

export const dockerRouter = createTRPCRouter({
  getContainers: publicProcedure.query(async () => {
    // Check if the value already in the cache from redis
    const cachedData = await dockerCache.getAsync();
    const isCacheYoungerThan5Minutes = cachedData?.isFresh;
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
    // Only return the name, id, status, image, and ports of each containers from all instances
    const sanitizedContainers = sanitizeContainers(containers);
    // Save the data into the cache
    await dockerCache.setAsync({
      containers,
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
  state: string;
  image: string;
  ports: Docker.Port[];
}

function sanitizeContainers(
  containers: (Docker.ContainerInfo & { instance: string })[],
): DockerContainer[] {
  return containers.map((container) => {
    return {
      name: container.Names[0]?.split("/")[1] || "Unknown",
      id: container.Id,
      instance: container.instance,
      state: container.State,
      image: container.Image,
      ports: container.Ports,
    };
  });
}
