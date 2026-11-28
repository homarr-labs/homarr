import type { RouterOutputs } from "@homarr/api";
import type { SystemHealthMonitoring } from "@homarr/integrations";

import type { DiskSample } from "./chart/disk-chart";

export type ChartItem = {
  cpu: number | null;
  cpuCores: NonNullable<SystemHealthMonitoring["cpuCores"]>;
  memory: number | null;
  gpu: number | null;
  network: { up: number; down: number } | null;
  disks: DiskSample[];
};

export const toChartItem = (
  healthInfo: {
    cpuUtilization: number | null;
    cpuCores?: SystemHealthMonitoring["cpuCores"];
    memUsedInBytes: number | null;
    gpu: { processorUtilization: number | null }[];
    network: { up: number; down: number } | null;
    fileSystem?: DiskSample[];
  } | null,
): ChartItem => {
  if (healthInfo === null) return { cpu: null, cpuCores: [], memory: null, gpu: null, network: null, disks: [] };
  const gpuSamples = healthInfo.gpu
    .map(({ processorUtilization }) => processorUtilization)
    .filter((value) => value !== null);
  let gpu = null;
  if (gpuSamples.length > 0) gpu = gpuSamples.reduce((sum, usage) => sum + usage, 0) / gpuSamples.length;
  return {
    cpu: healthInfo.cpuUtilization,
    cpuCores: (healthInfo.cpuCores ?? [])
      .filter((core) => Number.isFinite(core.utilization))
      .map((core) => ({ ...core, utilization: Math.min(100, Math.max(0, core.utilization)) })),
    memory: healthInfo.memUsedInBytes,
    gpu,
    network: healthInfo.network,
    disks: [
      ...new Map(
        (healthInfo.fileSystem ?? [])
          .filter((disk) => Number.isFinite(disk.percentage))
          .map((disk) => [disk.deviceName, disk] as const),
      ).values(),
    ],
  };
};

export const appendBoundedHistory = (history: ChartItem[], item: ChartItem, limit: number): ChartItem[] =>
  [...history, item].slice(-limit);

export const getNetworkHistory = (items: readonly ChartItem[]) => items.map((item) => item.network);

type HealthResults = RouterOutputs["widget"]["healthMonitoring"]["getSystemHealthStatus"];
export interface ResourceHistories {
  selectionKey: string;
  sources: Record<string, { time: number; unavailable: boolean; items: ChartItem[] }>;
}

export function updateResourceHistories(
  previous: ResourceHistories,
  selectionKey: string,
  results: HealthResults | undefined,
  limit: number,
): ResourceHistories {
  const sameSelection = selectionKey === previous.selectionKey;
  if (!results && sameSelection) return previous;
  const next: ResourceHistories = { selectionKey, sources: {} };
  if (!results) return next;
  for (const result of results) {
    const prior = sameSelection ? previous.sources[result.integrationId] : undefined;
    const time = new Date(result.updatedAt).getTime();
    if (!Number.isFinite(time) || time <= 0 || (prior && prior.time >= time)) {
      if (prior) next.sources[result.integrationId] = prior;
      continue;
    }
    const unavailable = result.healthInfo === null;
    let items = prior?.items ?? [];
    // A single gap represents the entire outage and keeps the earlier readings until new samples replace them.
    if (!unavailable || !prior?.unavailable) {
      items = appendBoundedHistory(items, toChartItem(result.healthInfo), limit);
    }
    next.sources[result.integrationId] = { time, unavailable, items };
  }
  return next;
}
