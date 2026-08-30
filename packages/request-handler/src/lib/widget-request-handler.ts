import { invalidateWidgetCache } from "@homarr/redis";

import { createWidgetSharedCacheAsync, hashSharedCacheInput } from "./shared-cache";
import { createRequestHandler } from "./request-handler";
import type { SharedCacheAdapter } from "./request-handler";

interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput, signal: AbortSignal) => Promise<TData>;
  cacheTtlMs?: number;
  fallbackToStaleOnError?: boolean;
  staleIfErrorTtlMs?: number;
  requestTimeoutMs?: number;
  cacheNamespace?: string;
  cacheVersion?: string;
}

export const createWidgetRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => {
  const cacheNamespace = options.cacheNamespace;
  let getSharedCacheAsync: ((input: TInput, cacheIdentity: string) => Promise<SharedCacheAdapter<TData>>) | undefined;
  if (cacheNamespace) {
    getSharedCacheAsync = async (_input, cacheIdentity) =>
      await createWidgetSharedCacheAsync<TData>({
        namespace: cacheNamespace,
        cacheIdentity,
        cacheVersion: options.cacheVersion,
      });
  }

  const inner = createRequestHandler<TData, TInput>({
    ...options,
    cacheTtlMs: options.cacheTtlMs,
    fallbackToStaleOnError: options.fallbackToStaleOnError,
    staleIfErrorTtlMs: options.staleIfErrorTtlMs,
    requestTimeoutMs: options.requestTimeoutMs,
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
