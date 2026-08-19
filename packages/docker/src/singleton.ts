import { readFileSync } from "node:fs";
import Docker from "dockerode";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import { env } from "./env";
import type { DockerEndpointCapability, DockerEndpointDescriptor } from "./endpoint-descriptor";
import {
  createLegacySocketDescriptor,
  createLegacyTcpDescriptor,
  getDockerEndpointHost,
  parseDockerEndpointDescriptors,
} from "./endpoint-descriptor";

export interface DockerInstance {
  endpointId: string;
  endpointName: string;
  host: string;
  descriptor: DockerEndpointDescriptor;
  instance: Docker;
}

export interface DockerEndpointInitializationFailure {
  descriptor: DockerEndpointDescriptor;
  host: string;
}

const logger = createLogger({ module: "dockerSingleton" });

export class DockerSingleton {
  private static instances: DockerInstance[] | null = null;
  private static initializationFailures: DockerEndpointInitializationFailure[] = [];

  private createInstanceSafely(descriptor: DockerEndpointDescriptor): DockerInstance[] {
    try {
      return [createInstance(descriptor)];
    } catch (error) {
      const host = getDockerEndpointHost(descriptor);
      DockerSingleton.initializationFailures.push({ descriptor, host });
      logger.warn(
        new ErrorWithMetadata(
          "Failed to initialize Docker endpoint",
          { endpointId: descriptor.id, host },
          { cause: error },
        ),
      );
      return [];
    }
  }

  private createInstances() {
    if (env.DOCKER_ENDPOINTS) {
      return parseDockerEndpointDescriptors(env.DOCKER_ENDPOINTS).flatMap((descriptor) =>
        this.createInstanceSafely(descriptor),
      );
    }

    const socketPaths = env.DOCKER_SOCKET_PATHS;
    const hostVariable = env.DOCKER_HOSTNAMES;
    const portVariable = env.DOCKER_PORTS;

    // Socket instances from DOCKER_SOCKET_PATHS
    const socketInstances: DockerInstance[] = socketPaths
      ? socketPaths
          .split(",")
          .flatMap((socketPath) => this.createInstanceSafely(createLegacySocketDescriptor(socketPath)))
      : [];

    // TCP instances from existing DOCKER_HOSTNAMES/DOCKER_PORTS
    let tcpInstances: DockerInstance[] = [];
    if (hostVariable !== undefined && portVariable !== undefined) {
      const hostnames = hostVariable.split(",");
      const ports = portVariable.split(",");

      if (hostnames.length !== ports.length) {
        throw new Error("The number of hosts and ports must match");
      }

      tcpInstances = hostnames.flatMap((host, i) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.createInstanceSafely(createLegacyTcpDescriptor(host, parseInt(ports[i]!, 10))),
      );
    }

    const instances = [...socketInstances, ...tcpInstances];

    // Default: local socket if nothing else configured
    if (instances.length === 0) {
      const descriptor = {
        ...createLegacySocketDescriptor("/var/run/docker.sock"),
        id: "socket:default",
        name: "Local Docker",
        source: "default" as const,
      };
      return [createInstance(descriptor)];
    }

    return instances;
  }

  public static findInstance(endpointId: string): DockerInstance | undefined {
    return this.getInstances().find((instance) => instance.endpointId === endpointId);
  }

  public static hasCapability(endpointId: string, capability: DockerEndpointCapability): boolean {
    return this.findInstance(endpointId)?.descriptor.capabilities.includes(capability) ?? false;
  }

  public static getInstances(): DockerInstance[] {
    if (this.instances) {
      return this.instances;
    }

    this.initializationFailures = [];
    this.instances = new DockerSingleton().createInstances();
    return this.instances;
  }

  public static getInitializationFailures(): DockerEndpointInitializationFailure[] {
    this.getInstances();
    return [...this.initializationFailures];
  }

  public static reset(): void {
    this.instances = null;
    this.initializationFailures = [];
  }
}

const createInstance = (descriptor: DockerEndpointDescriptor): DockerInstance => ({
  endpointId: descriptor.id,
  endpointName: descriptor.name,
  host: getDockerEndpointHost(descriptor),
  descriptor,
  instance: new Docker(createDockerOptions(descriptor)),
});

const createDockerOptions = (descriptor: DockerEndpointDescriptor) => {
  const transport = descriptor.transport;
  if (transport.type === "socket") return { socketPath: transport.path };
  if (transport.type === "tcp") return { host: transport.host, port: transport.port, protocol: "http" as const };
  return {
    host: transport.host,
    port: transport.port,
    protocol: "https" as const,
    ca: readFileSync(transport.caPath),
    ...(transport.certPath && transport.keyPath
      ? { cert: readFileSync(transport.certPath), key: readFileSync(transport.keyPath) }
      : {}),
  };
};
