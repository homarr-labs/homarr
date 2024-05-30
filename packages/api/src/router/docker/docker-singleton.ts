import Docker from "dockerode";

interface DockerInstance {
  host: string;
  instance: Docker;
}

export class DockerSingleton {
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
