import { ParseError } from "@homarr/common/server";
import { dockerContainerStates } from "@homarr/definitions";
import type { DockerContainerState } from "@homarr/definitions";
import { z } from "zod/v4";

const INVALID_LIST_RESPONSE_MESSAGE = "Invalid Komodo resource list response";
const INVALID_CONTAINER_LIST_RESPONSE_MESSAGE = "Invalid Komodo container list response";
const INVALID_VERSION_RESPONSE_MESSAGE = "Invalid Komodo version response";

const komodoContainerStatsSchema = z.object({
  cpu_perc: z.string(),
  mem_usage: z.string(),
});

const komodoContainerListItemSchema = z.object({
  server_id: z.string().nullish(),
  server_name: z.string().nullish(),
  name: z.string().optional(),
  id: z.string().nullish(),
  image: z.string().nullish(),
  state: z.string().optional(),
  stats: z.unknown().nullish(),
});

const komodoMinimalSystemStatsSchema = z.object({
  cpu_perc: z.number(),
  load_average: z.object({
    one: z.number(),
    five: z.number(),
    fifteen: z.number(),
  }),
  mem_used_gb: z.number(),
  mem_total_gb: z.number(),
  disk_used_gb: z.number(),
  disk_total_gb: z.number(),
  network_ingress_bytes: z.number().default(0),
  network_egress_bytes: z.number().default(0),
  polling_rate: z.string().optional(),
});

const komodoServerOverviewListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  template: z.boolean().optional(),
  info: z.object({
    state: z.string(),
    version: z.string().nullish(),
    core_count: z.number().int().nonnegative().nullish(),
    logical_core_count: z.number().int().nonnegative().nullish(),
    stats: z.unknown().nullish(),
  }),
});

const komodoResourceListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  template: z.boolean().optional(),
  info: z.object({
    state: z.string(),
  }),
});

const komodoResourceListItemFallbackSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  template: z.boolean().optional(),
  info: z
    .object({
      state: z.string().optional(),
    })
    .optional(),
});

const komodoResourceListResponseSchema = z.array(z.unknown());

export const komodoVersionResponseSchema = z.object({
  version: z.string().min(1),
});

export type KomodoResourceKind = "server" | "stack" | "deployment";
export type KomodoResourceStatus = "healthy" | "warning" | "error" | "unknown";

export interface KomodoResource {
  id: string;
  name: string;
  state: string;
  status: KomodoResourceStatus;
}

export interface KomodoResourceSummary {
  total: number;
  healthy: number;
  warning: number;
  error: number;
  unknown: number;
}

export interface KomodoOverview {
  servers: KomodoResourceSummary;
  stacks: KomodoResourceSummary;
  deployments: KomodoResourceSummary;
}

export interface KomodoServerStats {
  cpuPercentage: number;
  loadAverage: {
    one: number;
    five: number;
    fifteen: number;
  };
  memoryUsedGb: number;
  memoryTotalGb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  networkIngressBytesPerSecond: number | null;
  networkEgressBytesPerSecond: number | null;
}

export interface KomodoServerOverviewItem extends KomodoResource {
  version: string | null;
  physicalCoreCount: number | null;
  logicalCoreCount: number | null;
  stats: KomodoServerStats | null;
}

export interface KomodoContainer {
  id: string;
  name: string;
  host: string;
  state: DockerContainerState | "unknown";
  image: string;
  cpuUsage: number;
  memoryUsage: number;
}

const statusStates = {
  server: {
    healthy: new Set(["ok"]),
    warning: new Set(["disabled"]),
    error: new Set(["notok", "not_ok"]),
  },
  stack: {
    healthy: new Set(["running"]),
    warning: new Set(["deploying", "paused", "stopped", "created", "removing", "down"]),
    error: new Set(["restarting", "dead", "unhealthy"]),
  },
  deployment: {
    healthy: new Set(["running"]),
    warning: new Set(["deploying", "created", "stopping", "removing", "paused", "exited", "not_deployed"]),
    error: new Set(["restarting", "dead", "unhealthy"]),
  },
} satisfies Record<KomodoResourceKind, Record<Exclude<KomodoResourceStatus, "unknown">, ReadonlySet<string>>>;

const normalizeState = (state: string) =>
  state
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_");

const dockerContainerStateSet = new Set<string>(dockerContainerStates);

const normalizeContainerState = (state: string): KomodoContainer["state"] => {
  const normalizedState = normalizeState(state);
  return dockerContainerStateSet.has(normalizedState) ? (normalizedState as DockerContainerState) : "unknown";
};

const byteUnitMultipliers: Readonly<Record<string, number>> = {
  b: 1,
  kb: 1000,
  mb: 1000 ** 2,
  gb: 1000 ** 3,
  tb: 1000 ** 4,
  kib: 1024,
  mib: 1024 ** 2,
  gib: 1024 ** 3,
  tib: 1024 ** 4,
};

const parsePercentage = (value: string | undefined) => {
  const parsed = Number.parseFloat(value?.replace("%", "").trim() ?? "");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const parseMemoryUsageBytes = (value: string | undefined) => {
  const usedValue = value?.split("/", 1)[0]?.trim();
  const match = /^(\d+(?:\.\d+)?)\s*([kmgt]?i?b)$/i.exec(usedValue ?? "");
  const amount = Number.parseFloat(match?.[1] ?? "");
  const multiplier = byteUnitMultipliers[match?.[2]?.toLowerCase() ?? ""];

  if (!Number.isFinite(amount) || multiplier === undefined) return 0;
  return amount * multiplier;
};

const pollingRateUnitSeconds = {
  sec: 1,
  min: 60,
  hr: 60 * 60,
  day: 24 * 60 * 60,
  wk: 7 * 24 * 60 * 60,
} as const;

export const parseKomodoPollingRateSeconds = (pollingRate: string | undefined): number | null => {
  const match = /^(\d+)-(sec|min|hr|day|wk)$/.exec(pollingRate ?? "");
  const amountText = match?.[1];
  const unit = match?.[2] as keyof typeof pollingRateUnitSeconds | undefined;
  if (!amountText || !unit) return null;

  const amount = Number(amountText);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;

  return amount * pollingRateUnitSeconds[unit];
};

export const mapKomodoResourceStatus = (kind: KomodoResourceKind, state: string): KomodoResourceStatus => {
  const normalizedState = normalizeState(state);
  const mappings = statusStates[kind];

  if (mappings.healthy.has(normalizedState)) return "healthy";
  if (mappings.warning.has(normalizedState)) return "warning";
  if (mappings.error.has(normalizedState)) return "error";
  return "unknown";
};

const readJsonAsync = async (response: { json: () => Promise<unknown> }, message: string) => {
  try {
    return await response.json();
  } catch (error) {
    throw new ParseError(message, {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
};

export const parseKomodoVersionResponseAsync = async (response: {
  json: () => Promise<unknown>;
}): Promise<z.infer<typeof komodoVersionResponseSchema>> => {
  const json = await readJsonAsync(response, INVALID_VERSION_RESPONSE_MESSAGE);
  const result = komodoVersionResponseSchema.safeParse(json);

  if (!result.success) {
    throw new ParseError(INVALID_VERSION_RESPONSE_MESSAGE, { cause: result.error });
  }

  return result.data;
};

export const parseKomodoResourceListResponseAsync = async (
  response: { json: () => Promise<unknown> },
  kind: KomodoResourceKind,
): Promise<KomodoResource[]> => {
  const json = await readJsonAsync(response, INVALID_LIST_RESPONSE_MESSAGE);
  const listResult = komodoResourceListResponseSchema.safeParse(json);

  if (!listResult.success) {
    throw new ParseError(INVALID_LIST_RESPONSE_MESSAGE, { cause: listResult.error });
  }

  return listResult.data.flatMap<KomodoResource>((item, index) => {
    const result = komodoResourceListItemSchema.safeParse(item);
    if (result.success) {
      if (result.data.template === true) return [];
      return [
        {
          id: result.data.id,
          name: result.data.name,
          state: result.data.info.state,
          status: mapKomodoResourceStatus(kind, result.data.info.state),
        },
      ];
    }

    const fallback = komodoResourceListItemFallbackSchema.safeParse(item);
    if (fallback.success && fallback.data.template === true) return [];
    const state = fallback.success ? (fallback.data.info?.state ?? "unknown") : "unknown";
    return [
      {
        id: fallback.success ? (fallback.data.id ?? `invalid-${index}`) : `invalid-${index}`,
        name: fallback.success ? (fallback.data.name ?? "Unknown resource") : "Unknown resource",
        state,
        status: "unknown",
      },
    ];
  });
};

export const parseKomodoServerOverviewResponseAsync = async (response: {
  json: () => Promise<unknown>;
}): Promise<KomodoServerOverviewItem[]> => {
  const json = await readJsonAsync(response, INVALID_LIST_RESPONSE_MESSAGE);
  const listResult = komodoResourceListResponseSchema.safeParse(json);

  if (!listResult.success) {
    throw new ParseError(INVALID_LIST_RESPONSE_MESSAGE, { cause: listResult.error });
  }

  return listResult.data.flatMap<KomodoServerOverviewItem>((item, index) => {
    const result = komodoServerOverviewListItemSchema.safeParse(item);
    if (!result.success) {
      const fallback = komodoResourceListItemFallbackSchema.safeParse(item);
      if (fallback.success && fallback.data.template === true) return [];

      const state = fallback.success ? (fallback.data.info?.state ?? "unknown") : "unknown";
      return [
        {
          id: fallback.success ? (fallback.data.id ?? `invalid-${index}`) : `invalid-${index}`,
          name: fallback.success ? (fallback.data.name ?? "Unknown server") : "Unknown server",
          state,
          status: mapKomodoResourceStatus("server", state),
          version: null,
          physicalCoreCount: null,
          logicalCoreCount: null,
          stats: null,
        },
      ];
    }

    if (result.data.template === true) return [];

    const statsResult = komodoMinimalSystemStatsSchema.safeParse(result.data.info.stats);
    const pollingRateSeconds = statsResult.success
      ? parseKomodoPollingRateSeconds(statsResult.data.polling_rate)
      : null;
    const stats = statsResult.success
      ? {
          cpuPercentage: statsResult.data.cpu_perc,
          loadAverage: {
            one: statsResult.data.load_average.one,
            five: statsResult.data.load_average.five,
            fifteen: statsResult.data.load_average.fifteen,
          },
          memoryUsedGb: statsResult.data.mem_used_gb,
          memoryTotalGb: statsResult.data.mem_total_gb,
          diskUsedGb: statsResult.data.disk_used_gb,
          diskTotalGb: statsResult.data.disk_total_gb,
          networkIngressBytesPerSecond:
            pollingRateSeconds === null ? null : statsResult.data.network_ingress_bytes / pollingRateSeconds,
          networkEgressBytesPerSecond:
            pollingRateSeconds === null ? null : statsResult.data.network_egress_bytes / pollingRateSeconds,
        }
      : null;

    return [
      {
        id: result.data.id,
        name: result.data.name,
        state: result.data.info.state,
        status: mapKomodoResourceStatus("server", result.data.info.state),
        version: result.data.info.version ?? null,
        physicalCoreCount: result.data.info.core_count ?? null,
        logicalCoreCount: result.data.info.logical_core_count ?? null,
        stats,
      },
    ];
  });
};

export const parseKomodoContainerListResponseAsync = async (response: {
  json: () => Promise<unknown>;
}): Promise<KomodoContainer[]> => {
  const json = await readJsonAsync(response, INVALID_CONTAINER_LIST_RESPONSE_MESSAGE);
  const listResult = komodoResourceListResponseSchema.safeParse(json);

  if (!listResult.success) {
    throw new ParseError(INVALID_CONTAINER_LIST_RESPONSE_MESSAGE, { cause: listResult.error });
  }

  return listResult.data.map<KomodoContainer>((item, index) => {
    const result = komodoContainerListItemSchema.safeParse(item);
    const container = result.success ? result.data : undefined;
    const serverId = container?.server_id ?? null;
    const host = container?.server_name ?? serverId ?? "Unknown server";
    const name = container?.name ?? "Unknown container";
    const stats = komodoContainerStatsSchema.safeParse(container?.stats);

    return {
      id: container?.id ?? `${serverId ?? "unknown-server"}:${name}:${index}`,
      name,
      host,
      state: normalizeContainerState(container?.state ?? "unknown"),
      image: container?.image ?? "",
      cpuUsage: stats.success ? parsePercentage(stats.data.cpu_perc) : 0,
      memoryUsage: stats.success ? parseMemoryUsageBytes(stats.data.mem_usage) : 0,
    };
  });
};

const summarizeResources = (resources: KomodoResource[]): KomodoResourceSummary => ({
  total: resources.length,
  healthy: resources.filter((resource) => resource.status === "healthy").length,
  warning: resources.filter((resource) => resource.status === "warning").length,
  error: resources.filter((resource) => resource.status === "error").length,
  unknown: resources.filter((resource) => resource.status === "unknown").length,
});

export const createKomodoOverview = (
  servers: KomodoResource[],
  stacks: KomodoResource[],
  deployments: KomodoResource[],
): KomodoOverview => ({
  servers: summarizeResources(servers),
  stacks: summarizeResources(stacks),
  deployments: summarizeResources(deployments),
});
