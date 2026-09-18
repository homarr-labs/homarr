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
  /** Shared native HTTP credentials; omit when authentication needs a service-specific exchange. */
  getHttpAuthentication?: (context: StatsAuthenticationContext) => IntegrationHttpAuthentication;
  /** Some admin APIs reject browser fetch metadata on server-to-server requests. */
  transport?: "fetch" | "axios";
  metrics: readonly StatsMetric[];
  fetchAsync: (context: StatsFetchContext) => Promise<Record<string, StatsValue>>;
}
