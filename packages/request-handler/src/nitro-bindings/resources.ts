import type { IntegrationKind } from "@homarr/definitions";
import type { IntegrationRuntimeResources } from "@homarr/integrations/runtime";
import type { StateChannels, StateDiagnostics, StateGenerations } from "@homarr/redis/state";
import type { Dispatcher, RequestInfo, RequestInit, Response } from "undici";
import type { LookupFunction } from "node:net";

import type { IntegrationOfKind } from "../lib/integration-request-runtime";

export interface WidgetProviderResources {
  readonly createIntegrationAsync: typeof import("@homarr/integrations/factory").createIntegrationAsync;
  createResourcesAsync(
    integration: IntegrationOfKind<IntegrationKind>,
    signal: AbortSignal,
    deadlineAt: number,
  ): Promise<IntegrationRuntimeResources>;
}

export interface WidgetHttpResources {
  runAsync<T>(signal: AbortSignal, operation: () => Promise<T>): Promise<T>;
  fetchAsync(input: RequestInfo, options?: RequestInit & { timeout?: number; bodyTimeout?: number }): Promise<Response>;
  createPinnedDispatcherAsync(input: {
    lookup: LookupFunction;
    autoSelectFamily: boolean;
    bodyTimeout: number;
    httpProxy: "";
    httpsProxy: "";
    noProxy: "*";
    signal: AbortSignal;
  }): Promise<Dispatcher>;
}

export interface WidgetBindingLog {
  debug(message: string, metadata?: Readonly<Record<string, unknown>>): void;
  warn(message: string, metadata?: Readonly<Record<string, unknown>>): void;
}

export interface WidgetBindingResources {
  readonly signal: AbortSignal;
  readonly channels: StateChannels;
  readonly generations: StateGenerations;
  readonly diagnostics: StateDiagnostics;
  readonly providers: WidgetProviderResources;
  readonly http: WidgetHttpResources;
  readonly log: WidgetBindingLog;
  createKeyedFingerprint(value: string): string;
}
