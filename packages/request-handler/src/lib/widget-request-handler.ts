import { invalidateWidgetCache } from "@homarr/redis";

import { createWidgetSharedCacheAsync, hashSharedCacheInput } from "./shared-cache";
import { createRequestHandler } from "./request-handler";
import type { SharedCacheAdapter } from "./request-handler";

interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput) => Promise<TData>;
  cacheTtlMs?: number;
  fallbackToStaleOnError?: boolean;
  staleIfErrorTtlMs?: number;
  cacheNamespace?: string;
}

export const createWidgetRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => {
  const cacheNamespace = options.cacheNamespace;
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
    cacheTtlMs: options.cacheTtlMs,
    fallbackToStaleOnError: options.fallbackToStaleOnError,
    staleIfErrorTtlMs: options.staleIfErrorTtlMs,
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
