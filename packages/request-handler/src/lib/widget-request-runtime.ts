import { hashSharedCacheInput } from "./shared-cache-runtime";
import type { SharedCacheRuntime } from "./shared-cache-runtime";
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
  signal?: AbortSignal;
}

export interface WidgetRequestResources {
  sharedCache: SharedCacheRuntime;
  invalidateWidgetCache(namespace: string): void;
}

export const createWidgetRequestRuntime = (resources: WidgetRequestResources) => {
  const { invalidateWidgetCache } = resources;
  const { createWidgetSharedCacheAsync } = resources.sharedCache;
  const createWidgetRequestHandler = <TData, TInput extends Record<string, unknown>>(
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
      stopAsync: inner.stopAsync,
      invalidateCache: () => {
        inner.invalidateCache();
        if (cacheNamespace) invalidateWidgetCache(cacheNamespace);
      },
      handler: inner.handler,
    };
  };
  return { createWidgetRequestHandler };
};
