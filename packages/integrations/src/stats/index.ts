import type { IntegrationKind } from "@homarr/definitions";

import type { IntegrationInput } from "../base/integration";
import { existingStatsProviders } from "./existing";
import { statsProviders } from "./providers";
import { StatsIntegration } from "./stats-integration";
import { isStatsFetchResult } from "./types";
import type { StatsFetchResult, StatsProvider } from "./types";

export { fetchStatsGroupsAsync } from "./types";
export type { StatsFetchResult, StatsMetric, StatsUnit, StatsValue } from "./types";

export const getStatsMetrics = (kind: IntegrationKind) => {
  const provider = (statsProviders as Partial<Record<IntegrationKind, StatsProvider>>)[kind];
  return provider?.metrics ?? existingStatsProviders[kind]?.metrics ?? [];
};

// Do not launch repeated legacy calls after a caller's deadline expires. Legacy
// SDKs may ignore transport cancellation; retain this guard until their work settles.
const legacyPending = new Set<string>();
const maxLegacyPending = 128;

export const fetchStatsAsync = async (input: IntegrationInput & { kind: IntegrationKind }, signal: AbortSignal) => {
  const provider = (statsProviders as Partial<Record<IntegrationKind, StatsProvider>>)[input.kind];
  if (provider) return normalizeResult(await new StatsIntegration(input, provider).getStatsAsync(signal));
  const existing = existingStatsProviders[input.kind];
  if (!existing) throw new Error("Statistics are not supported by this integration");
  signal.throwIfAborted();
  if (legacyPending.has(input.id)) throw new Error("Previous statistics request is still running");
  if (legacyPending.size >= maxLegacyPending) throw new Error("Legacy statistics request limit reached");
  legacyPending.add(input.id);
  try {
    return normalizeResult(await existing.fetchAsync(input, signal));
  } finally {
    legacyPending.delete(input.id);
  }
};

const normalizeResult = (result: Parameters<typeof isStatsFetchResult>[0]): StatsFetchResult => {
  if (isStatsFetchResult(result)) return result;
  return { values: result, unavailableMetrics: [] };
};
