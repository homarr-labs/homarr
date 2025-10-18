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

    const stats = await instance.getContainer(container.Id).stats({ stream: false, "one-shot": true });

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
      cpuUsage: calculateCpuUsage(stats),
      // memory usage by default includes cache, which should not be shown as it is also not shown with docker stats command
      // The below type is probably wrong, sometimes stats can be null
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      memoryUsage: stats.memory_stats.usage - (stats.memory_stats.stats?.cache ?? 0),
      image: container.Image,
      ports: container.Ports,
    };
  });

  return (await Promise.all(containerStatsPromises)).filter((container) => container !== null);
}

function calculateCpuUsage(stats: ContainerStats): number {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const numberOfCpus = stats.cpu_stats.online_cpus || 1;

  if (systemDelta === 0) return 0;

  return (cpuDelta / systemDelta) * numberOfCpus * 100;
}
