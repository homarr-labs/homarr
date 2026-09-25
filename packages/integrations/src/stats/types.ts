import type { RequestInit } from "undici";
import type { IntegrationSecretKind } from "@homarr/definitions";

import type { IntegrationHttpAuthentication } from "../http-auth";

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
  /** Legacy reusable credentials; prefer integration httpAuth metadata for standard schemes. */
  getHttpAuthentication?: (context: StatsAuthenticationContext) => IntegrationHttpAuthentication;
  /** Exchange saved credentials using the same trusted request transport as Stats. */
  getHttpAuthenticationAsync?: (context: StatsFetchContext) => Promise<IntegrationHttpAuthentication>;
  /** Some admin APIs reject browser fetch metadata on server-to-server requests. */
  transport?: "fetch" | "axios";
  metrics: readonly StatsMetric[];
  fetchAsync: (context: StatsFetchContext) => Promise<Record<string, StatsValue>>;
}
