import type { IntegrationKind } from "@homarr/definitions";

import type { IntegrationInput } from "../base/integration";
import { getIntegrationRuntimeResources } from "../runtime/context";
import { createLegacyStatsGuard } from "./-runtime/legacy-guard";
import { existingStatsProviders } from "./existing";
import { statsProviders } from "./providers";
import { StatsIntegration } from "./stats-integration";
import type { StatsProvider } from "./types";

export type { StatsMetric, StatsUnit, StatsValue } from "./types";

export const getStatsMetrics = (kind: IntegrationKind) => {
  const provider = (statsProviders as Partial<Record<IntegrationKind, StatsProvider>>)[kind];
  return provider?.metrics ?? existingStatsProviders[kind]?.metrics ?? [];
};

const legacyGuard = createLegacyStatsGuard();

export const fetchStatsAsync = async (input: IntegrationInput & { kind: IntegrationKind }, signal: AbortSignal) => {
  const context = getIntegrationRuntimeResources()?.context;
  const operationSignal = context ? AbortSignal.any([signal, context.signal]) : signal;
  const provider = (statsProviders as Partial<Record<IntegrationKind, StatsProvider>>)[input.kind];
  if (provider) return await new StatsIntegration(input, provider).getStatsAsync(operationSignal);
  const existing = existingStatsProviders[input.kind];
  if (!existing) throw new Error("Statistics are not supported by this integration");
  return await legacyGuard.runAsync(input.id, operationSignal, () => existing.fetchAsync(input, operationSignal));
};
