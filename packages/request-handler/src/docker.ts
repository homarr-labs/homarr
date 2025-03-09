import dayjs from "dayjs";
import { z } from "zod";

import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema";

import type { ContainerState } from "../../docker/src";
import { DockerSingleton } from "../../docker/src";
import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

interface ContainerInfo {
  Id: string;
  Names: string[];
  State: string;
  Status: string;
  Image: string;
}

export const dockerContainersRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "dockerContainersResult",
  widgetKind: "dockerContainers",
  async requestAsync() {
    const containers = await getContainersWithStats();

    return responseSchema.parse({ containers });
  },
  cacheDuration: dayjs.duration(20, "seconds"),
});

const responseSchema = z.object({
  containers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      state: z.string(),
      status: z.string(),
      iconUrl: z.string().nullable(),
      cpuUsage: z.number(),
      memoryUsage: z.number(),
      instance: z.string(),
    }),
  ),
});

export type DockerContainersStatus = z.infer<typeof responseSchema>;
const dockerInstances = DockerSingleton.getInstances();

const containers = await Promise.all(
  dockerInstances.map(async ({ instance, host }) => {
    const instanceContainers = await instance.listContainers({ all: true });
    return instanceContainers.map((container) => ({
      ...container,
      instance: host,
    }));
  }),
).then((res) => res.flat());

// Extract image name from container
const extractImage = (container: ContainerInfo) => container.Image.split("/").at(-1)?.split(":").at(0) ?? "";
// Prepare LIKE queries for fetching matching icons
const likeQueries = containers.map((container) => like(icons.name, `%${extractImage(container)}%`));
// Fetch matching icons from the database
const dbIcons =
  likeQueries.length > 0
    ? await db.query.icons.findMany({
        where: or(...likeQueries),
      })
    : [];

async function getContainersWithStats() {
  const containerStatsPromises = containers.map(async (container) => {
    const instance = dockerInstances.find(({ host }) => host === container.instance)?.instance;
    if (!instance) return null;

    const stats = await instance.getContainer(container.Id).stats({ stream: false });
    return {
      id: container.Id,
      name: container.Names[0]?.split("/")[1] ?? "Unknown",
      state: container.State as ContainerState,
      status: container.Status,
      iconUrl:
        dbIcons.find((icon) => {
          const extractedImage = extractImage(container);
          if (!extractedImage) return false;
          return icon.name.toLowerCase().includes(extractedImage.toLowerCase());
        })?.url ?? null,
      cpuUsage: calculateCpuUsage(stats) || 0,
      memoryUsage: stats.memory_stats.usage || 0,
      instance: container.instance,
    };
  });

  return (await Promise.all(containerStatsPromises)).filter(Boolean);
}

interface CpuStats {
  cpu_usage: {
    total_usage: number;
  };
  system_cpu_usage: number;
  online_cpus: number;
}

interface PreCpuStats {
  cpu_usage: {
    total_usage: number;
  };
  system_cpu_usage: number;
}

interface Stats {
  cpu_stats: CpuStats;
  precpu_stats: PreCpuStats;
  memory_stats: {
    usage: number;
  };
}

function calculateCpuUsage(stats: Stats): number {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const numberOfCpus = stats.cpu_stats.online_cpus || 1;

  if (systemDelta === 0) return 0;

  return (cpuDelta / systemDelta) * numberOfCpus * 100;
}
