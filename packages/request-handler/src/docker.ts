import type { Readable } from "node:stream";
import dayjs from "dayjs";
import type { Container, ContainerInfo, ContainerStats } from "dockerode";
import type Dockerode from "dockerode";

import { bestMatch } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema";
import { extractContainerImageName } from "@homarr/definitions";
import type { ContainerState, Port } from "@homarr/docker";
import { dockerLabels, DockerSingleton } from "@homarr/docker";

import { createDockerLogStreamProcessor, decodeDockerLogs } from "./docker-log-decode";
import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

const logger = createLogger({ module: "dockerRequestHandler" });

const isDemoMode = ["1", "yes", "t", "true"].includes((process.env.DEMO_MODE ?? "").toLowerCase());

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

export const dockerContainersRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "dockerContainersResult",
  widgetKind: "dockerContainers",
  async requestAsync() {
    if (isDemoMode) {
      return mockContainers;
    }
    return await getContainersWithStatsAsync();
  },
  cacheDuration: dayjs.duration(20, "seconds"),
});

const extractImage = (container: ContainerInfo) => extractContainerImageName(container.Image);

const findContainerByIdAsync = async (id: string) => {
  const dockerInstances = DockerSingleton.getInstances();
  const containers = await Promise.all(
    dockerInstances.map(async ({ instance }) => {
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
    }),
  );

  return containers.find((container) => container) ?? null;
};

export const getContainerLogsAsync = async (id: string, tail = 200) => {
  const container = await findContainerByIdAsync(id);
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
  id: string,
  tail: number,
  onData: (data: string) => void,
  onError: (err: Error) => void,
) => {
  const container = await findContainerByIdAsync(id);
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

async function getContainersWithStatsAsync() {
  const dockerInstances = DockerSingleton.getInstances();
  const results = await Promise.allSettled(
    dockerInstances.map(async ({ instance, host }) => {
      const instanceContainers = await instance.listContainers({ all: true });
      return instanceContainers
        .filter((container) => !(dockerLabels.hide in container.Labels))
        .map((container) => ({ ...container, instance: host }));
    }),
  );

  const containers = results.flatMap((result, index) => {
    if (result.status === "fulfilled") return result.value;
    logger.warn(
      new ErrorWithMetadata(
        "Failed to list containers from Docker host",
        {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          host: dockerInstances[index]!.host,
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

  const containerStatsPromises = containers.map(async (container) => {
    const instance = dockerInstances.find(({ host }) => host === container.instance)?.instance;
    if (!instance) return null;

    const stats = await instance
      .getContainer(container.Id)
      .stats({ stream: false, "one-shot": true })
      .catch(
        () =>
          ({
            cpu_stats: { online_cpus: 0, cpu_usage: { total_usage: 0 }, system_cpu_usage: 0 },
            memory_stats: { usage: 0 },
          }) as ContainerStats,
      );

    const cpuUsage = calculateCpuUsage(stats);
    const memoryUsage = calculateMemoryUsage(stats);

    return {
      id: container.Id,
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

  return (await Promise.all(containerStatsPromises)).filter((container) => container !== null);
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
