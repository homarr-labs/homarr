import { ParseError } from "@homarr/common/server";
import { z } from "zod/v4";

const INVALID_LIST_RESPONSE_MESSAGE = "Invalid Komodo resource list response";
const INVALID_VERSION_RESPONSE_MESSAGE = "Invalid Komodo version response";

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

export interface KomodoProblem extends KomodoResource {
  kind: KomodoResourceKind;
}

export interface KomodoOverview {
  servers: KomodoResourceSummary;
  stacks: KomodoResourceSummary;
  deployments: KomodoResourceSummary;
  problemCount: number;
  problems: KomodoProblem[];
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
  networkIngressBytes: number;
  networkEgressBytes: number;
}

export interface KomodoServerOverviewItem extends KomodoResource {
  version: string | null;
  physicalCoreCount: number | null;
  logicalCoreCount: number | null;
  stats: KomodoServerStats | null;
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
          networkIngressBytes: statsResult.data.network_ingress_bytes,
          networkEgressBytes: statsResult.data.network_egress_bytes,
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

const summarizeResources = (resources: KomodoResource[]): KomodoResourceSummary => ({
  total: resources.length,
  healthy: resources.filter((resource) => resource.status === "healthy").length,
  warning: resources.filter((resource) => resource.status === "warning").length,
  error: resources.filter((resource) => resource.status === "error").length,
  unknown: resources.filter((resource) => resource.status === "unknown").length,
});

const PROBLEM_LIST_LIMIT = 20;

export const createKomodoOverview = (
  servers: KomodoResource[],
  stacks: KomodoResource[],
  deployments: KomodoResource[],
): KomodoOverview => {
  const problems = [
    ...servers.map((resource) => ({ ...resource, kind: "server" as const })),
    ...stacks.map((resource) => ({ ...resource, kind: "stack" as const })),
    ...deployments.map((resource) => ({ ...resource, kind: "deployment" as const })),
  ].filter((resource) => resource.status !== "healthy");

  return {
    servers: summarizeResources(servers),
    stacks: summarizeResources(stacks),
    deployments: summarizeResources(deployments),
    problemCount: problems.length,
    problems: problems.slice(0, PROBLEM_LIST_LIMIT),
  };
};
