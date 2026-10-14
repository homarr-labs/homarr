import type { IntegrationKind } from "@homarr/definitions";
import { withIntegrationRuntimeAsync } from "@homarr/integrations/runtime";

import { createIntegrationRequestRuntime } from "../lib/integration-request-runtime";
import type { IntegrationOfKind } from "../lib/integration-request-runtime";
import { createRequestHandler } from "../lib/request-handler";
import type { SharedCacheAdapter } from "../lib/request-handler";
import { createSharedCacheRuntime } from "../lib/shared-cache-runtime";
import { createWidgetRequestRuntime } from "../lib/widget-request-runtime";
import type { WidgetBindingResources } from "./resources";

interface RequestOptions<TData, TInput extends Record<string, unknown>> {
  requestAsync(input: TInput, signal: AbortSignal): Promise<TData>;
  cacheTtlMs?: number;
  fallbackToStaleOnError?: boolean;
  staleIfErrorTtlMs?: number;
  requestTimeoutMs?: number;
  cacheNamespace?: string;
  cacheVersion?: string;
  getCacheKey?: (input: TInput) => string;
  getSharedCacheAsync?: (input: TInput, cacheIdentity: string) => Promise<SharedCacheAdapter<TData>>;
}

interface IntegrationOptions<TData, TKind extends IntegrationKind, TInput extends Record<string, unknown>> extends Omit<
  RequestOptions<TData, TInput>,
  "requestAsync" | "getCacheKey" | "getSharedCacheAsync"
> {
  requestAsync(integration: IntegrationOfKind<TKind>, input: TInput, signal: AbortSignal): Promise<TData>;
}

export const createOwnedRequestFactories = (resources: WidgetBindingResources) => {
  resources.signal.throwIfAborted();
  const lifetime = new AbortController();
  const signal = AbortSignal.any([resources.signal, lifetime.signal]);
  const stops = new Set<() => Promise<void>>();
  const pending = new Set<Promise<unknown>>();
  const sharedCache = createSharedCacheRuntime({
    channels: resources.channels,
    diagnostics: resources.diagnostics,
    getIntegrationCacheGenerationAsync: resources.generations.getIntegrationCacheGenerationAsync,
    getWidgetCacheGenerationAsync: resources.generations.getWidgetCacheGenerationAsync,
  });
  const integrationRuntime = createIntegrationRequestRuntime({
    sharedCache,
    createKeyedFingerprint: resources.createKeyedFingerprint,
    invalidateIntegrationResponseCacheAsync: resources.generations.invalidateIntegrationResponseCacheAsync,
  });
  const widgetRuntime = createWidgetRequestRuntime({
    sharedCache,
    invalidateWidgetCache: (namespace) => {
      void track(resources.generations.invalidateWidgetCacheAsync(namespace)).catch((error: unknown) => {
        resources.diagnostics.warn("Widget cache invalidation failed", { cacheNamespace: namespace }, error);
      });
    },
  });
  const own = <T extends { stopAsync(): Promise<void> }>(handler: T): T => {
    signal.throwIfAborted();
    stops.add(handler.stopAsync);
    return handler;
  };
  const track = <T>(operation: Promise<T>): Promise<T> => {
    pending.add(operation);
    void operation.then(
      () => pending.delete(operation),
      () => pending.delete(operation),
    );
    return operation;
  };
  const createIntegrationRequestHandler = <
    TData,
    TKind extends IntegrationKind,
    TInput extends Record<string, unknown>,
  >(
    options: IntegrationOptions<TData, TKind, TInput>,
  ) =>
    own(
      integrationRuntime.createIntegrationRequestHandler<TData, TKind, TInput>({
        ...options,
        signal,
        requestAsync: (integration, input, requestSignal) =>
          track(
            (async () => {
              requestSignal.throwIfAborted();
              const deadlineAt = Date.now() + (options.requestTimeoutMs ?? 60_000);
              const providerResources = await resources.providers.createResourcesAsync(
                integration,
                requestSignal,
                deadlineAt,
              );
              requestSignal.throwIfAborted();
              const context = {
                ...providerResources.context,
                signal: AbortSignal.any([requestSignal, providerResources.context.signal]),
                deadlineAt: Math.min(deadlineAt, providerResources.context.deadlineAt),
              };
              return await withIntegrationRuntimeAsync({ ...providerResources, context }, async () => {
                context.signal.throwIfAborted();
                const data = await track(options.requestAsync(integration, input, context.signal));
                context.signal.throwIfAborted();
                return data;
              });
            })(),
          ),
      }),
    );
  const createWidgetRequestHandler = <TData, TInput extends Record<string, unknown>>(
    options: RequestOptions<TData, TInput>,
  ) =>
    own(
      widgetRuntime.createWidgetRequestHandler<TData, TInput>({
        ...options,
        signal,
        requestAsync: (input, requestSignal) =>
          track(resources.http.runAsync(requestSignal, () => options.requestAsync(input, requestSignal))),
      }),
    );
  const createPlainRequestHandler = <TData, TInput extends Record<string, unknown>>(
    options: RequestOptions<TData, TInput>,
  ) =>
    own(
      createRequestHandler({
        ...options,
        signal,
        requestAsync: (input, requestSignal) =>
          track(resources.http.runAsync(requestSignal, () => options.requestAsync(input, requestSignal))),
      }),
    );
  let stopping: Promise<void> | undefined;
  return {
    createIntegrationRequestHandler,
    createWidgetRequestHandler,
    createPlainRequestHandler,
    getIntegrationCacheIdentity: integrationRuntime.getIntegrationCacheIdentity,
    stopAsync: () => {
      stopping ??= (async () => {
        lifetime.abort(new Error("Widget request bindings are stopped"));
        const settled = await Promise.allSettled([...stops].map((stop) => stop()));
        await Promise.allSettled(pending);
        const errors = settled.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
        if (errors.length > 0) throw new AggregateError(errors, "Widget request cleanup failed");
      })();
      return stopping;
    },
  };
};

export type OwnedRequestFactories = ReturnType<typeof createOwnedRequestFactories>;
