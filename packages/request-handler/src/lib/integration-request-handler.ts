import type { Modify } from "@homarr/common/types";
import type { Integration, IntegrationSecret } from "@homarr/db/schema";
import type { IntegrationKind } from "@homarr/definitions";
import { invalidateIntegrationResponseCacheAsync } from "@homarr/redis";

import { createIntegrationSharedCacheAsync, hashIntegrationCacheOptions } from "./shared-cache";
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
}

export const createIntegrationRequestHandler = <
  TData,
  TKind extends IntegrationKind,
  TInput extends Record<string, unknown>,
>(
  options: Options<TData, TKind, TInput>,
) => {
  const cacheNamespace = options.cacheNamespace;
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
    cacheTtlMs: options.cacheTtlMs,
    fallbackToStaleOnError: options.fallbackToStaleOnError,
    staleIfErrorTtlMs: options.staleIfErrorTtlMs,
    getSharedCacheAsync,
  });

  return {
    invalidateCache: inner.invalidateCache,
    /** Clears this handler's L1 and every shared response-cache namespace for these integrations. */
    invalidateCacheAsync: async (integrationIds: readonly string[]) => {
      inner.invalidateCache();
      if (!cacheNamespace) return;
      await Promise.all(
        [...new Set(integrationIds)].map(async (integrationId) => {
          await invalidateIntegrationResponseCacheAsync(integrationId);
        }),
      );
    },
    handler: (integration: IntegrationOfKind<TKind>, itemOptions: TInput) =>
      inner.handler({ integration, options: itemOptions }),
  };
};
