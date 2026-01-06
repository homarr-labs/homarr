import dayjs from "dayjs";
import type { Container, ContainerInfo, ContainerStats } from "dockerode";

import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema";
import type { ContainerState } from "@homarr/docker";
import { dockerLabels, DockerSingleton } from "@homarr/docker";

import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

export const dockerContainersRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "dockerContainersResult",
  widgetKind: "dockerContainers",
  async requestAsync() {
    return await getContainersWithStatsAsync();
  },
  cacheDuration: dayjs.duration(20, "seconds"),
});

const dockerInstances = DockerSingleton.getInstances();

const extractImage = (container: ContainerInfo) => container.Image.split("/").at(-1)?.split(":").at(0) ?? "";

const findContainerByIdAsync = async (id: string) => {
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

  const stream = await container.logs({
    tail,
    stdout: true,
    stderr: true,
    follow: true,
  });

  // Docker multiplexed stream processing
  let buffer = Buffer.alloc(0);

  const processChunk = (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 8) {
      const length = buffer.readUInt32BE(4);
      const fullMessageSize = 8 + length;

      if (buffer.length < fullMessageSize) {
        // Wait for more data
        break;
      }

      const payload = buffer.subarray(8, fullMessageSize);
      onData(payload.toString("utf-8"));

      buffer = buffer.subarray(fullMessageSize);
    }
  };

  stream.on("data", processChunk);
  stream.on("error", onError);

  return () => {
    stream.removeListener("data", processChunk);
    stream.removeListener("error", onError);
    stream.destroy();
  };
};

const decodeDockerLogs = (logs: Buffer | string) => {
  if (typeof logs === "string") {
    return logs;
  }

  // Docker multiplexed stream: 1 byte stream type, 3 bytes padding, 4 bytes big-endian length, then payload
  // Repeat until buffer consumed.
  let cursor = 0;
  const parts: string[] = [];

  while (cursor < logs.length) {
    // Defensive: need at least 8 bytes header
    if (cursor + 8 > logs.length) {
      break;
    }

    const length = logs.readUInt32BE(cursor + 4);
    const start = cursor + 8;
    const end = start + length;
    if (end > logs.length) {
      break;
    }

    const payload = logs.subarray(start, end);
    parts.push(payload.toString("utf-8"));
    cursor = end;
  }

  return parts.join("");
};

async function getContainersWithStatsAsync() {
  const containers = await Promise.all(
    dockerInstances.map(async ({ instance, host }) => {
      const instanceContainers = await instance.listContainers({ all: true });
      return instanceContainers
        .filter((container) => !(dockerLabels.hide in container.Labels))
        .map((container) => ({ ...container, instance: host }));
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

    // Get stats, falling back to an empty stats object if fetch fails
    // calculateCpuUsage and calculateMemoryUsage will return 0 for invalid/missing stats
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
  });

  return (await Promise.all(containerStatsPromises)).filter((container) => container !== null);
}

function calculateCpuUsage(stats: ContainerStats): number {
  // Handle containers with missing or invalid stats (e.g., exited, dead containers)
  if (!stats.cpu_stats.online_cpus || stats.cpu_stats.online_cpus === 0 || !stats.cpu_stats.cpu_usage.total_usage) {
    return 0;
  }

  const numberOfCpus = stats.cpu_stats.online_cpus;
  const usage = stats.cpu_stats.system_cpu_usage;
  if (!usage || usage === 0) {
    return 0;
  }

  return (stats.cpu_stats.cpu_usage.total_usage / usage) * numberOfCpus * 100;
}

function calculateMemoryUsage(stats: ContainerStats): number {
  // Handle containers with missing or invalid stats (e.g., exited, dead containers)
  if (!stats.memory_stats.usage) {
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
