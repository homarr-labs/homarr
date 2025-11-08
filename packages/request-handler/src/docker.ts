import dayjs from "dayjs";
import type { ContainerInfo, ContainerStats } from "dockerode";

import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema";

import type { ContainerState } from "../../docker/src";
import { DockerSingleton } from "../../docker/src";
import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

export const dockerContainersRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "dockerContainersResult",
  widgetKind: "dockerContainers",
  async requestAsync() {
    const containers = await getContainersWithStatsAsync();

    return containers;
  },
  cacheDuration: dayjs.duration(20, "seconds"),
});

const dockerInstances = DockerSingleton.getInstances();

const extractImage = (container: ContainerInfo) => container.Image.split("/").at(-1)?.split(":").at(0) ?? "";

async function getContainersWithStatsAsync() {
  const containers = await Promise.all(
    dockerInstances.map(async ({ instance, host }) => {
      const instanceContainers = await instance.listContainers({ all: true });
      return instanceContainers.map((container) => ({
        ...container,
        instance: host,
      }));
    }),
  ).then((res) => res.flat());

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

    try {
    const stats = await instance.getContainer(container.Id).stats({ stream: false, "one-shot": true });

      // Mark containers with invalid stats as orphaned (orphaned/errored containers)
      // These containers often have null/undefined cpu_stats.online_cpus
      if (!isStatsValid(stats)) {
        return {
          id: container.Id,
          name: container.Names[0]?.split("/")[1] ?? "Unknown",
          state: "orphaned" as ContainerState,
          iconUrl:
            dbIcons.find((icon) => {
              const extractedImage = extractImage(container);
              if (!extractedImage) return false;
              return icon.name.toLowerCase().includes(extractedImage.toLowerCase());
            })?.url ?? null,
          cpuUsage: 0,
          memoryUsage: 0,
          image: container.Image,
          ports: container.Ports,
        };
      }

      const cpuUsage = calculateCpuUsage(stats);
      const memoryUsage = calculateMemoryUsage(stats);

    return {
      id: container.Id,
      name: container.Names[0]?.split("/")[1] ?? "Unknown",
      state: container.State as ContainerState,
      iconUrl:
        dbIcons.find((icon) => {
          const extractedImage = extractImage(container);
          if (!extractedImage) return false;
          return icon.name.toLowerCase().includes(extractedImage.toLowerCase());
        })?.url ?? null,
        cpuUsage,
        memoryUsage,
        image: container.Image,
        ports: container.Ports,
      };
    } catch (error) {
      // Mark containers that fail to fetch stats as orphaned
      return {
        id: container.Id,
        name: container.Names[0]?.split("/")[1] ?? "Unknown",
        state: "orphaned" as ContainerState,
        iconUrl:
          dbIcons.find((icon) => {
            const extractedImage = extractImage(container);
            if (!extractedImage) return false;
            return icon.name.toLowerCase().includes(extractedImage.toLowerCase());
          })?.url ?? null,
        cpuUsage: 0,
        memoryUsage: 0,
      image: container.Image,
      ports: container.Ports,
    };
    }
  });

  return (await Promise.all(containerStatsPromises)).filter((container) => container !== null);
}

/**
 * Validates that container stats are valid and can be processed.
 * Orphaned or errored containers often have null/undefined cpu_stats.online_cpus
 * or missing cpu_stats/memory_stats entirely.
 */
function isStatsValid(stats: ContainerStats): boolean {
  // Check if cpu_stats exists and has valid online_cpus
  if (!stats.cpu_stats || stats.cpu_stats.online_cpus == null || stats.cpu_stats.online_cpus === 0) {
    return false;
  }

  // Check if memory_stats exists
  if (!stats.memory_stats || stats.memory_stats.usage == null) {
    return false;
  }

  // Check if cpu_usage exists
  if (!stats.cpu_stats.cpu_usage || stats.cpu_stats.cpu_usage.total_usage == null) {
    return false;
  }

  return true;
}

function calculateCpuUsage(stats: ContainerStats): number {
  // These checks are redundant after isStatsValid, but kept for extra safety
  if (!stats.cpu_stats?.online_cpus || !stats.cpu_stats?.cpu_usage?.total_usage) {
    return 0;
  }

  const numberOfCpus = stats.cpu_stats.online_cpus;

  const usage = stats.cpu_stats.system_cpu_usage;
  if (!usage || usage === 0) return 0;

  return (stats.cpu_stats.cpu_usage.total_usage / usage) * numberOfCpus * 100;
}

function calculateMemoryUsage(stats: ContainerStats): number {
  // These checks are redundant after isStatsValid, but kept for extra safety
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
