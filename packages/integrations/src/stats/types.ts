import type { RequestInit } from "undici";
import type { IntegrationSecretKind } from "@homarr/definitions";

import type { IntegrationHttpAuthentication } from "../http-auth";

const STATS_REQUEST_TIMEOUT_MS = 30_000;

export type StatsValue = number | string | boolean | null;
export type StatsUnit =
  | "count"
  | "bytes"
  | "grams"
  | "percent"
  | "seconds"
  | "milliseconds"
  | "bytesPerSecond"
  | "text";

export interface StatsMetric {
  key: string;
  label: string;
  unit: StatsUnit;
}

export interface StatsFetchResult {
  values: Record<string, StatsValue>;
  unavailableMetrics: string[];
}

export type StatsProviderResult = Record<string, StatsValue> | StatsFetchResult;

export interface StatsAuthenticationContext {
  secret: (kind: IntegrationSecretKind) => string;
  hasSecret: (kind: IntegrationSecretKind) => boolean;
}

export interface StatsFetchContext extends StatsAuthenticationContext {
  /** Relative service path. The shared client applies trusted certificates and a deadline. */
  requestAsync: (path: `/${string}`, init?: RequestInit) => Promise<unknown>;
  signal: AbortSignal;
}

export interface StatsProvider {
  /** Shared native HTTP credentials; omit when authentication needs a service-specific exchange. */
  getHttpAuthentication?: (context: StatsAuthenticationContext) => IntegrationHttpAuthentication;
  /** Some admin APIs reject browser fetch metadata on server-to-server requests. */
  transport?: "fetch" | "axios";
  metrics: readonly StatsMetric[];
  fetchAsync: (context: StatsFetchContext) => Promise<StatsProviderResult>;
}

export const isStatsFetchResult = (result: StatsProviderResult): result is StatsFetchResult =>
  "values" in result && "unavailableMetrics" in result && Array.isArray(result.unavailableMetrics);

export const createStatsRequestSignal = (sourceSignal: AbortSignal, requestSignal?: AbortSignal | null) => {
  const signals = [sourceSignal, AbortSignal.timeout(STATS_REQUEST_TIMEOUT_MS)];
  if (requestSignal) signals.push(requestSignal);
  return AbortSignal.any(signals);
};

export async function fetchStatsGroupsAsync(
  groups: readonly { metrics: readonly string[]; fetchAsync: () => Promise<Record<string, StatsValue>> }[],
): Promise<StatsFetchResult> {
  const settled = await Promise.allSettled(groups.map((group) => group.fetchAsync()));
  const values: Record<string, StatsValue> = {};
  const unavailableMetrics: string[] = [];
  const failures: unknown[] = [];

  for (const [index, result] of settled.entries()) {
    const group = groups[index];
    if (!group) continue;
    if (result.status === "fulfilled") {
      Object.assign(values, result.value);
      continue;
    }
    failures.push(result.reason);
    unavailableMetrics.push(...group.metrics);
  }

  if (failures.length === groups.length) throw new AggregateError(failures, "All statistics requests failed");
  return { values, unavailableMetrics };
}
