import Docker from "dockerode";

import { env } from "./env";

export interface DockerInstance {
  host: string;
  instance: Docker;
}

export class DockerSingleton {
  private static instances: DockerInstance[] | null = null;

  private createInstances() {
    const socketPaths = env.DOCKER_SOCKET_PATHS;
    const hostVariable = env.DOCKER_HOSTNAMES;
    const portVariable = env.DOCKER_PORTS;

    // Socket instances from DOCKER_SOCKET_PATHS
    const socketInstances: DockerInstance[] = socketPaths
      ? socketPaths.split(",").map((socketPath) => ({
          host: socketPath,
          instance: new Docker({ socketPath }),
        }))
      : [];

    // TCP instances from existing DOCKER_HOSTNAMES/DOCKER_PORTS
    let tcpInstances: DockerInstance[] = [];
    if (hostVariable !== undefined && portVariable !== undefined) {
      const hostnames = hostVariable.split(",");
      const ports = portVariable.split(",");

      if (hostnames.length !== ports.length) {
        throw new Error("The number of hosts and ports must match");
      }

      tcpInstances = hostnames.map((host, i) => ({
        host: `${host}:${ports[i]}`,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        instance: new Docker({ host, port: parseInt(ports[i]!, 10) }),
      }));
    }

    const instances = [...socketInstances, ...tcpInstances];

    // Default: local socket if nothing else configured
    if (instances.length === 0) {
      return [{ host: "socket", instance: new Docker() }];
    }

    return instances;
  }

  public static findInstance(host: string): DockerInstance | undefined {
    return this.instances?.find((instance) => instance.host === host);
  }

  public static getInstances(): DockerInstance[] {
    if (this.instances) {
      return this.instances;
    }

    this.instances = new DockerSingleton().createInstances();
    return this.instances;
  }
}
