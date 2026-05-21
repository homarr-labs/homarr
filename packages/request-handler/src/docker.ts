import type { Readable } from "node:stream";
import dayjs from "dayjs";
import type { Container, ContainerInfo, ContainerStats } from "dockerode";
import type Dockerode from "dockerode";

import { bestMatch } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema";
import type { ContainerState } from "@homarr/docker";
import { dockerLabels, DockerSingleton } from "@homarr/docker";

import { createDockerLogStreamProcessor, decodeDockerLogs } from "./docker-log-decode";
import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

const logger = createLogger({ module: "dockerRequestHandler" });

export const dockerContainersRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "dockerContainersResult",
  widgetKind: "dockerContainers",
  async requestAsync() {
    return await getContainersWithStatsAsync();
  },
  cacheDuration: dayjs.duration(20, "seconds"),
});

const extractImage = (container: ContainerInfo) => container.Image.split("/").at(-1)?.split(":").at(0) ?? "";

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
