import { invalidateWidgetCache } from "@homarr/redis";
import type { WidgetModuleServerCachePolicy } from "@homarr/definitions";

import { createWidgetSharedCacheAsync, hashSharedCacheInput } from "./integration-shared-cache";
import { createRequestHandler } from "./request-handler";
import type { SharedCacheAdapter } from "./request-handler";

interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput) => Promise<TData>;
  cacheTtlMs?: number;
  fallbackToStaleOnError?: boolean;
  staleIfErrorTtlMs?: number;
  cacheNamespace?: string;
  cachePolicy?: WidgetModuleServerCachePolicy & { scope: "shared" };
}

export const createWidgetRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => {
  const cacheNamespace = options.cachePolicy?.namespace ?? options.cacheNamespace;
  let getSharedCacheAsync: ((input: TInput) => Promise<SharedCacheAdapter<TData>>) | undefined;
  if (cacheNamespace) {
    getSharedCacheAsync = async (input) =>
      await createWidgetSharedCacheAsync<TData>({
        namespace: cacheNamespace,
        cacheInput: input,
      });
  }

  const inner = createRequestHandler<TData, TInput>({
    ...options,
    cacheTtlMs: options.cachePolicy?.ttlMs ?? options.cacheTtlMs,
    fallbackToStaleOnError: options.cachePolicy?.staleIfErrorTtlMs !== undefined || options.fallbackToStaleOnError,
    staleIfErrorTtlMs: options.cachePolicy?.staleIfErrorTtlMs ?? options.staleIfErrorTtlMs,
    getCacheKey: hashSharedCacheInput,
    getSharedCacheAsync,
  });
  return {
    invalidateCache: () => {
      inner.invalidateCache();
      if (cacheNamespace) invalidateWidgetCache(cacheNamespace);
    },
    handler: inner.handler,
  };
};
