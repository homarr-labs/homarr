import type { RequestInit } from "undici";
import type { IntegrationSecretKind } from "@homarr/definitions";

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

export interface StatsFetchContext {
  /** Relative service path. The shared client applies trusted certificates and a deadline. */
  requestAsync: (path: `/${string}`, init?: RequestInit) => Promise<unknown>;
  secret: (kind: IntegrationSecretKind) => string;
  hasSecret: (kind: IntegrationSecretKind) => boolean;
  signal: AbortSignal;
}

export interface StatsProvider {
  /** Some admin APIs reject browser fetch metadata on server-to-server requests. */
  transport?: "fetch" | "axios";
  metrics: readonly StatsMetric[];
  fetchAsync: (context: StatsFetchContext) => Promise<Record<string, StatsValue>>;
}
