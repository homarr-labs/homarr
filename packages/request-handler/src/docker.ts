import type { Readable } from "node:stream";
import type { Container, ContainerInfo, ContainerStats } from "dockerode";
import type Dockerode from "dockerode";

import { bestMatch } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema";
import { extractContainerImageName } from "@homarr/definitions";
import type { ContainerState, DockerContainerTarget, DockerEndpointStatus, Port } from "@homarr/docker";
import { dockerLabels, DockerSingleton } from "@homarr/docker";

import { createDockerLogStreamProcessor, decodeDockerLogs } from "./docker-log-decode";
import { createWidgetRequestHandler } from "./lib/widget-request-handler";

const logger = createLogger({ module: "dockerRequestHandler" });
export const dockerWidgetEndpointTimeoutMs = 5_000;

const withDockerTimeoutAsync = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  message: string,
  timeoutMs: number,
) => {
  const controller = new AbortController();
  const timeoutError = new Error(message);
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort(timeoutError);
          reject(timeoutError);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const isDemoMode = () => ["1", "yes", "t", "true"].includes((process.env.DEMO_MODE ?? "").toLowerCase());

const port = (privatePort: number, publicPort: number, type: string): Port => ({
  IP: "0.0.0.0",
  PrivatePort: privatePort,
  PublicPort: publicPort,
  Type: type,
});

const mockContainers: {
  id: string;
  name: string;
  host: string;
  state: ContainerState;
  image: string;
  iconUrl: string;
  cpuUsage: number;
  memoryUsage: number;
  ports: Port[];
}[] = [
  {
    id: "a1b2c3d4e5f6",
    name: "sonarr",
    host: "local",
    state: "running",
    image: "lscr.io/linuxserver/sonarr:latest",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/sonarr.svg",
    cpuUsage: 2.3,
    memoryUsage: 256 * 1024 * 1024,
    ports: [port(8989, 8989, "tcp")],
  },
  {
    id: "b2c3d4e5f6a7",
    name: "radarr",
    host: "local",
    state: "running",
    image: "lscr.io/linuxserver/radarr:latest",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/radarr.svg",
    cpuUsage: 1.8,
    memoryUsage: 220 * 1024 * 1024,
    ports: [port(7878, 7878, "tcp")],
  },
  {
    id: "c3d4e5f6a7b8",
    name: "plex",
    host: "local",
    state: "running",
    image: "lscr.io/linuxserver/plex:latest",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/plex.svg",
    cpuUsage: 12.5,
    memoryUsage: 1024 * 1024 * 1024,
    ports: [port(32400, 32400, "tcp")],
  },
  {
    id: "d4e5f6a7b8c9",
    name: "qbittorrent",
    host: "local",
    state: "running",
    image: "lscr.io/linuxserver/qbittorrent:latest",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/qbittorrent.svg",
    cpuUsage: 5.1,
    memoryUsage: 380 * 1024 * 1024,
    ports: [port(8080, 8080, "tcp")],
  },
  {
    id: "e5f6a7b8c9d0",
    name: "prowlarr",
    host: "local",
    state: "running",
    image: "lscr.io/linuxserver/prowlarr:latest",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/prowlarr.svg",
    cpuUsage: 0.8,
    memoryUsage: 120 * 1024 * 1024,
    ports: [port(9696, 9696, "tcp")],
  },
  {
    id: "f6a7b8c9d0e1",
    name: "overseerr",
    host: "local",
    state: "running",
    image: "lscr.io/linuxserver/overseerr:latest",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/overseerr.svg",
    cpuUsage: 1.2,
    memoryUsage: 180 * 1024 * 1024,
    ports: [port(5055, 5055, "tcp")],
  },
  {
    id: "a7b8c9d0e1f2",
    name: "homarr",
    host: "local",
    state: "running",
    image: "ghcr.io/homarr-labs/homarr:latest",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr.svg",
    cpuUsage: 3.4,
    memoryUsage: 290 * 1024 * 1024,
    ports: [port(7575, 7575, "tcp")],
  },
  {
    id: "b8c9d0e1f2a3",
    name: "pihole",
    host: "local",
    state: "running",
    image: "pihole/pihole:latest",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/pi-hole.svg",
    cpuUsage: 0.5,
    memoryUsage: 95 * 1024 * 1024,
    ports: [port(80, 80, "tcp"), port(53, 53, "udp")],
  },
  {
    id: "c9d0e1f2a3b4",
    name: "nginx-proxy",
    host: "local",
    state: "running",
    image: "jc21/nginx-proxy-manager:latest",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/nginx-proxy-manager.svg",
    cpuUsage: 0.3,
    memoryUsage: 65 * 1024 * 1024,
    ports: [port(443, 443, "tcp"), port(81, 81, "tcp")],
  },
  {
    id: "d0e1f2a3b4c5",
    name: "watchtower",
    host: "local",
    state: "running",
    image: "containrrr/watchtower:latest",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/watchtower.svg",
    cpuUsage: 0.1,
    memoryUsage: 30 * 1024 * 1024,
    ports: [],
  },
  {
    id: "e1f2a3b4c5d6",
    name: "tdarr",
    host: "local",
    state: "exited",
    image: "ghcr.io/haveagitgat/tdarr:latest",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/tdarr.svg",
    cpuUsage: 0,
    memoryUsage: 0,
    ports: [],
  },
  {
    id: "f2a3b4c5d6e7",
    name: "bazarr",
    host: "local",
    state: "running",
    image: "lscr.io/linuxserver/bazarr:latest",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/bazarr.svg",
    cpuUsage: 0.6,
    memoryUsage: 110 * 1024 * 1024,
    ports: [port(6767, 6767, "tcp")],
  },
];

export const dockerContainersRequestHandler = createWidgetRequestHandler({
  async requestAsync() {
    if (isDemoMode()) {
      return {
        containers: mockContainers.map((container) => ({
          ...container,
          endpointId: "demo",
          endpointName: "Demo Docker",
          resourceId: `demo:${container.id}`,
        })),
        endpoints: [
          {
            id: "demo",
            name: "Demo Docker",
            status: "available",
            kind: "docker",
            transport: "socket",
            capabilities: ["inventory"],
            source: "default",
            scope: "admin",
          },
        ] satisfies DockerEndpointStatus[],
      };
    }
    return await getContainersWithStatsAsync();
  },
});

const extractImage = (container: ContainerInfo) => extractContainerImageName(container.Image);

export const hasDockerEndpointCapability = (
  endpointId: string,
  capability: "inventory" | "logs" | "lifecycle" | "remove",
) =>
  isDemoMode()
    ? endpointId === "demo" && capability === "inventory"
    : DockerSingleton.hasCapability(endpointId, capability);

export const findDockerContainerAsync = async (
  { endpointId, id }: DockerContainerTarget,
  requiredCapability: "inventory" | "logs" | "lifecycle" | "remove" = "inventory",
) => {
  const dockerInstance = DockerSingleton.findInstance(endpointId);
  if (!dockerInstance || !hasDockerEndpointCapability(endpointId, requiredCapability)) return null;

  const container = dockerInstance.instance.getContainer(id);
  return await new Promise<Container | null>((resolve) => {
    container.inspect((err, data) => resolve(err || !data ? null : container));
  });
};

export const getContainerLogsAsync = async (target: DockerContainerTarget, tail = 200) => {
  const container = await findDockerContainerAsync(target, "logs");
  if (!container) {
    return null;
  }

  const rawLogs = await container.logs({
    tail,
    stdout: true,
    stderr: true,
    follow: false,
  });

  return decodeDockerLogs(rawLogs);
};

export const streamContainerLogsAsync = async (
  target: DockerContainerTarget,
  tail: number,
  onData: (data: string) => void,
  onError: (err: Error) => void,
) => {
  const container = await findDockerContainerAsync(target, "logs");
  if (!container) {
    onError(new Error("Container not found"));
    return () => undefined;
  }

  const stream = (await container.logs({
    tail,
    stdout: true,
    stderr: true,
    follow: true,
  })) as Readable;

  const MAX_MESSAGE_SIZE = 1024 * 1024;
  const processChunk = createDockerLogStreamProcessor(onData, onError, MAX_MESSAGE_SIZE);

  const handleChunk = (chunk: Buffer) => {
    const shouldContinue = processChunk(chunk);
    if (!shouldContinue) {
      stream.removeListener("data", handleChunk);
      stream.removeListener("error", onError);
      stream.destroy();
    }
  };

  stream.on("data", handleChunk);
  stream.on("error", onError);

  return () => {
    stream.removeListener("data", handleChunk);
    stream.removeListener("error", onError);
    stream.destroy();
  };
};

export const getDockerEndpointsAsync = (): DockerEndpointStatus[] => {
  const dockerInstances = DockerSingleton.getInstances();
  const initializationFailures = DockerSingleton.getInitializationFailures();

  return [
    ...dockerInstances.map(({ endpointId, endpointName, descriptor }) => ({
      id: endpointId,
      name: endpointName,
      status: "available" as const,
      kind: descriptor.kind,
      transport: descriptor.transport.type,
      capabilities: descriptor.capabilities,
      source: descriptor.source,
      scope: descriptor.scope,
    })),
    ...initializationFailures.map(({ descriptor }) => ({
      id: descriptor.id,
      name: descriptor.name,
      status: "unavailable" as const,
      kind: descriptor.kind,
      transport: descriptor.transport.type,
      capabilities: descriptor.capabilities,
      source: descriptor.source,
      scope: descriptor.scope,
    })),
  ];
};

export async function getContainersWithStatsAsync(timeoutMs = dockerWidgetEndpointTimeoutMs) {
  const dockerInstances = DockerSingleton.getInstances();
  const initializationFailures = DockerSingleton.getInitializationFailures();
  const results = await Promise.allSettled(
    dockerInstances.map(async ({ instance, host, endpointId, endpointName }) => {
      const instanceContainers = await withDockerTimeoutAsync(
        async (signal) => await instance.listContainers({ all: true, abortSignal: signal }),
        `Timed out listing containers from Docker host ${host}`,
        timeoutMs,
      );
      return instanceContainers
        .filter((container) => !(dockerLabels.hide in container.Labels))
        .map((container) => ({ ...container, instance: host, endpointId, endpointName }));
    }),
  );

  const endpoints = [
    ...results.map((result, index) => {
      const dockerInstance = dockerInstances.at(index);
      if (!dockerInstance) throw new Error("Docker endpoint result did not match a configured endpoint");
      return {
        id: dockerInstance.endpointId,
        name: dockerInstance.endpointName,
        status: result.status === "fulfilled" ? ("available" as const) : ("unavailable" as const),
        kind: dockerInstance.descriptor.kind,
        transport: dockerInstance.descriptor.transport.type,
        capabilities: dockerInstance.descriptor.capabilities,
        source: dockerInstance.descriptor.source,
        scope: dockerInstance.descriptor.scope,
      } satisfies DockerEndpointStatus;
    }),
    ...initializationFailures.map(({ descriptor }) => ({
      id: descriptor.id,
      name: descriptor.name,
      status: "unavailable" as const,
      kind: descriptor.kind,
      transport: descriptor.transport.type,
      capabilities: descriptor.capabilities,
      source: descriptor.source,
      scope: descriptor.scope,
    })),
  ] satisfies DockerEndpointStatus[];

  const containers = results.flatMap((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const dockerInstance = dockerInstances.at(index);
    logger.warn(
      new ErrorWithMetadata(
        "Failed to list containers from Docker host",
        {
          host: dockerInstance?.host ?? "unknown",
        },
        { cause: result.reason },
      ),
    );

    return [];
  });
  const likeQueries = containers.map((container) => like(icons.name, `%${extractImage(container)}%`));

  const dbIcons =
    likeQueries.length > 0
      ? await db.query.icons.findMany({
          where: or(...likeQueries),
        })
      : [];

  const degradedEndpointIds = new Set<string>();
  const containerStatsPromises = containers.map(async (container) => {
    const instance = DockerSingleton.findInstance(container.endpointId)?.instance;
    if (!instance) return null;

    let stats: ContainerStats;
    try {
      stats = await withDockerTimeoutAsync(
        async (signal) => {
          const options = { stream: false as const, "one-shot": true, abortSignal: signal };
          return await instance.getContainer(container.Id).stats(options);
        },
        `Timed out reading Docker container stats for ${container.Id}`,
        timeoutMs,
      );
    } catch (error) {
      degradedEndpointIds.add(container.endpointId);
      logger.warn(
        new ErrorWithMetadata(
          "Failed to read Docker container stats",
          { endpointId: container.endpointId, containerId: container.Id, host: container.instance },
          { cause: error },
        ),
      );
      stats = {
        cpu_stats: { online_cpus: 0, cpu_usage: { total_usage: 0 }, system_cpu_usage: 0 },
        memory_stats: { usage: 0 },
      } as ContainerStats;
    }

    const cpuUsage = calculateCpuUsage(stats);
    const memoryUsage = calculateMemoryUsage(stats);

    return {
      id: container.Id,
      endpointId: container.endpointId,
      endpointName: container.endpointName,
      resourceId: `${container.endpointId}:${container.Id}`,
      name: container.Names[0]?.split("/")[1] ?? "Unknown",
      host: container.instance,
      state: container.State as ContainerState,
      iconUrl: bestMatch(extractImage(container), dbIcons, (icon) => icon.name)?.url ?? null,
      cpuUsage,
      memoryUsage,
      image: container.Image,
      ports: container.Ports as Dockerode.Port[] | undefined,
    };
  });

  const resolvedContainers = (await Promise.all(containerStatsPromises)).filter((container) => container !== null);
  return {
    containers: resolvedContainers,
    endpoints: endpoints.map((endpoint) =>
      endpoint.status === "available" && degradedEndpointIds.has(endpoint.id)
        ? { ...endpoint, status: "degraded" as const }
        : endpoint,
    ),
  };
}

export function calculateCpuUsage(stats: ContainerStats): number {
  // Handle containers with missing or invalid stats (e.g., exited, dead containers, Podman responses)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!stats.cpu_stats?.online_cpus || stats.cpu_stats.online_cpus === 0 || !stats.cpu_stats.cpu_usage?.total_usage) {
    return 0;
  }

  const numberOfCpus = stats.cpu_stats.online_cpus;
  const usage = stats.cpu_stats.system_cpu_usage;
  if (!usage || usage === 0) {
    return 0;
  }

  return (stats.cpu_stats.cpu_usage.total_usage / usage) * numberOfCpus * 100;
}

export function calculateMemoryUsage(stats: ContainerStats): number {
  // Handle containers with missing or invalid stats (e.g., exited, dead containers, Podman responses)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!stats.memory_stats?.usage) {
    return 0;
  }

  return (
    stats.memory_stats.usage -
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (stats.memory_stats.stats?.cache ??
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      stats.memory_stats.stats?.total_inactive_file ??
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      stats.memory_stats.stats?.inactive_file ??
      0)
  );
}
