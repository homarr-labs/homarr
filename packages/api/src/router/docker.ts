import Docker from "dockerode";

import { createTRPCRouter, publicProcedure } from "../trpc";

// ENV DOCKER_HOST: z.string().optional(),
// DOCKER_PORT: z.number().optional(),

class DockerSingleton {
  private static instances: Docker[];

  private createInstances() {
    const instances: Docker[] = [];
    // Get the docker socket from the environment variable
    const hostVariable = process.env.DOCKER_HOST;
    const portVariable = process.env.DOCKER_PORT;
    if (hostVariable === undefined || portVariable === undefined) {
      instances.push(new Docker());
      return {
        ...instances,
        names: ["default"],
      };
    }
    // Split the instances at the comma
    const hosts = hostVariable.split(",");
    const ports = portVariable.split(",");
    if (hosts.length !== ports.length) {
      throw new Error("The number of hosts and ports must match");
    }
    hosts.forEach((host, i) => {
      instances.push(
        new Docker({
          host,
          port: parseInt(ports[i] || "", 10),
        }),
      );
      return instances;
    });
    return {
      ...instances,
      names: hosts,
    };
  }

  public static getInstance(): Docker[] {
    if (!DockerSingleton.instances) {
      DockerSingleton.instances = new DockerSingleton().createInstances();
    }

    return this.instances;
  }
}

export default DockerSingleton;

export const dockerRouter = createTRPCRouter({
  getContainers: publicProcedure.query(async () => {
    // Check if the value already in the cache from redis
    const docker = DockerSingleton.getInstance();
    const containers = await Promise.all(
      // Return all the containers of all the instances into only one item
      docker.map((d) => d.listContainers({ all: true })),
    ).then((containers) => containers.flat());
    // Only return the name, id, status, image, and ports of each containers from all instances
    const sanitizedContainers = containers.map((container) => ({
      name: container.Names[0],
      id: container.Id,
      status: container.State,
      image: container.Image,
      ports: container.Ports,
    }));

    return { containers: sanitizedContainers };
  }),
});
