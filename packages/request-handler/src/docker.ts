import dayjs from "dayjs";
import type { ContainerInfo, ContainerStats } from "dockerode";
import type Dockerode from "dockerode";

import { bestMatch } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema";
import type { ContainerState } from "@homarr/docker";
import { dockerLabels, DockerSingleton } from "@homarr/docker";

import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

const logger = createLogger({ module: "dockerRequestHandler" });

const isDemoMode = ["1", "yes", "t", "true"].includes((process.env.DEMO_MODE ?? "").toLowerCase());

const mockContainers = [
  { id: "a1b2c3d4e5f6", name: "sonarr", host: "local", state: "running" as ContainerState, image: "lscr.io/linuxserver/sonarr:latest", iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/sonarr.svg", cpuUsage: 2.3, memoryUsage: 256 * 1024 * 1024, ports: [{ PrivatePort: 8989, PublicPort: 8989, Type: "tcp" }] },
  { id: "b2c3d4e5f6a7", name: "radarr", host: "local", state: "running" as ContainerState, image: "lscr.io/linuxserver/radarr:latest", iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/radarr.svg", cpuUsage: 1.8, memoryUsage: 220 * 1024 * 1024, ports: [{ PrivatePort: 7878, PublicPort: 7878, Type: "tcp" }] },
  { id: "c3d4e5f6a7b8", name: "plex", host: "local", state: "running" as ContainerState, image: "lscr.io/linuxserver/plex:latest", iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/plex.svg", cpuUsage: 12.5, memoryUsage: 1024 * 1024 * 1024, ports: [{ PrivatePort: 32400, PublicPort: 32400, Type: "tcp" }] },
  { id: "d4e5f6a7b8c9", name: "qbittorrent", host: "local", state: "running" as ContainerState, image: "lscr.io/linuxserver/qbittorrent:latest", iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/qbittorrent.svg", cpuUsage: 5.1, memoryUsage: 380 * 1024 * 1024, ports: [{ PrivatePort: 8080, PublicPort: 8080, Type: "tcp" }] },
  { id: "e5f6a7b8c9d0", name: "prowlarr", host: "local", state: "running" as ContainerState, image: "lscr.io/linuxserver/prowlarr:latest", iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/prowlarr.svg", cpuUsage: 0.8, memoryUsage: 120 * 1024 * 1024, ports: [{ PrivatePort: 9696, PublicPort: 9696, Type: "tcp" }] },
  { id: "f6a7b8c9d0e1", name: "overseerr", host: "local", state: "running" as ContainerState, image: "lscr.io/linuxserver/overseerr:latest", iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/overseerr.svg", cpuUsage: 1.2, memoryUsage: 180 * 1024 * 1024, ports: [{ PrivatePort: 5055, PublicPort: 5055, Type: "tcp" }] },
  { id: "a7b8c9d0e1f2", name: "homarr", host: "local", state: "running" as ContainerState, image: "ghcr.io/homarr-labs/homarr:latest", iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr.svg", cpuUsage: 3.4, memoryUsage: 290 * 1024 * 1024, ports: [{ PrivatePort: 7575, PublicPort: 7575, Type: "tcp" }] },
  { id: "b8c9d0e1f2a3", name: "pihole", host: "local", state: "running" as ContainerState, image: "pihole/pihole:latest", iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/pi-hole.svg", cpuUsage: 0.5, memoryUsage: 95 * 1024 * 1024, ports: [{ PrivatePort: 80, PublicPort: 80, Type: "tcp" }, { PrivatePort: 53, PublicPort: 53, Type: "udp" }] },
  { id: "c9d0e1f2a3b4", name: "nginx-proxy", host: "local", state: "running" as ContainerState, image: "jc21/nginx-proxy-manager:latest", iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/nginx-proxy-manager.svg", cpuUsage: 0.3, memoryUsage: 65 * 1024 * 1024, ports: [{ PrivatePort: 443, PublicPort: 443, Type: "tcp" }, { PrivatePort: 81, PublicPort: 81, Type: "tcp" }] },
  { id: "d0e1f2a3b4c5", name: "watchtower", host: "local", state: "running" as ContainerState, image: "containrrr/watchtower:latest", iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/watchtower.svg", cpuUsage: 0.1, memoryUsage: 30 * 1024 * 1024, ports: [] },
  { id: "e1f2a3b4c5d6", name: "tdarr", host: "local", state: "exited" as ContainerState, image: "ghcr.io/haveagitgat/tdarr:latest", iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/tdarr.svg", cpuUsage: 0, memoryUsage: 0, ports: [] },
  { id: "f2a3b4c5d6e7", name: "bazarr", host: "local", state: "running" as ContainerState, image: "lscr.io/linuxserver/bazarr:latest", iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/bazarr.svg", cpuUsage: 0.6, memoryUsage: 110 * 1024 * 1024, ports: [{ PrivatePort: 6767, PublicPort: 6767, Type: "tcp" }] },
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

const extractImage = (container: ContainerInfo) => container.Image.split("/").at(-1)?.split(":").at(0) ?? "";

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

  // memory usage by default includes cache, which should not be shown as it is also not shown with docker stats command
  // See https://docs.docker.com/reference/cli/docker/container/stats/ how it is / was calculated
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
