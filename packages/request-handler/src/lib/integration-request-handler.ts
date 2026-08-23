import type { Modify } from "@homarr/common/types";
import type { Integration, IntegrationSecret } from "@homarr/db/schema";
import type { IntegrationKind, WidgetModuleServerCachePolicy } from "@homarr/definitions";

import { createIntegrationSharedCacheAsync, hashIntegrationCacheOptions } from "./integration-shared-cache";
import { createRequestHandler } from "./request-handler";
import type { SharedCacheAdapter } from "./request-handler";

type IntegrationOfKind<TKind extends IntegrationKind> = Omit<Integration, "kind"> & {
  kind: TKind;
  decryptedSecrets: Modify<Pick<IntegrationSecret, "kind" | "value">, { value: string }>[];
  externalUrl: string | null;
};

interface Options<TData, TKind extends IntegrationKind, TInput extends Record<string, unknown>> {
  requestAsync: (integration: IntegrationOfKind<TKind>, input: TInput) => Promise<TData>;
  cacheTtlMs?: number;
  fallbackToStaleOnError?: boolean;
  staleIfErrorTtlMs?: number;
  cacheNamespace?: string;
  cachePolicy?: WidgetModuleServerCachePolicy & { scope: "integration" };
}

export const createIntegrationRequestHandler = <
  TData,
  TKind extends IntegrationKind,
  TInput extends Record<string, unknown>,
>(
  options: Options<TData, TKind, TInput>,
) => {
  const cacheNamespace = options.cachePolicy?.namespace ?? options.cacheNamespace;
  let getSharedCacheAsync:
    | ((input: { integration: IntegrationOfKind<TKind>; options: TInput }) => Promise<SharedCacheAdapter<TData>>)
    | undefined;
  if (cacheNamespace) {
    getSharedCacheAsync = async ({ integration, options: itemOptions }) =>
      await createIntegrationSharedCacheAsync({
        namespace: cacheNamespace,
        integrationId: integration.id,
        cacheOptions: itemOptions,
      });
  }

  const inner = createRequestHandler<TData, { integration: IntegrationOfKind<TKind>; options: TInput }>({
    requestAsync: async ({ integration, options: itemOptions }) => options.requestAsync(integration, itemOptions),
    getCacheKey: ({ integration, options: itemOptions }) =>
      `${integration.id}:${hashIntegrationCacheOptions(itemOptions)}`,
    cacheTtlMs: options.cachePolicy?.ttlMs ?? options.cacheTtlMs,
    fallbackToStaleOnError: options.cachePolicy?.staleIfErrorTtlMs !== undefined || options.fallbackToStaleOnError,
    staleIfErrorTtlMs: options.cachePolicy?.staleIfErrorTtlMs ?? options.staleIfErrorTtlMs,
    getSharedCacheAsync,
  });

  return {
    invalidateCache: inner.invalidateCache,
    handler: (integration: IntegrationOfKind<TKind>, itemOptions: TInput) =>
      inner.handler({ integration, options: itemOptions }),
  };
};
