import { AsyncLocalStorage } from "node:async_hooks";
import type { checkServerIdentity } from "node:tls";
import { fetch } from "undici";
import type { Dispatcher, Response } from "undici";

import { ResourceHttpAgent } from "@homarr/core/infrastructure/http/transport-agent";

import type { WidgetBindingLog, WidgetHttpResources } from "./resources";

export interface WidgetHttpTransportResources {
  readonly signal: AbortSignal;
  readonly ca: string | string[];
  readonly checkServerIdentity: typeof checkServerIdentity;
  readonly httpProxy: string;
  readonly httpsProxy: string;
  readonly noProxy: string;
  readonly log: WidgetBindingLog;
}

interface HttpResponseOrigin {
  signal: AbortSignal;
  dispatcher: Dispatcher;
  ownership: "owned" | "borrowed";
}

interface HttpScope {
  signal: AbortSignal;
  dispatchers: Set<Dispatcher>;
  responses: Map<Response, HttpResponseOrigin>;
  fetches: Set<Promise<Response>>;
  endingReason?: Error;
}

export const createWidgetHttpTransport = (resources: WidgetHttpTransportResources) => {
  resources.signal.throwIfAborted();
  if (
    typeof resources.httpProxy !== "string" ||
    typeof resources.httpsProxy !== "string" ||
    typeof resources.noProxy !== "string"
  ) {
    throw new Error("Widget HTTP proxy configuration must be explicit");
  }
  if (
    typeof resources.checkServerIdentity !== "function" ||
    !(typeof resources.ca === "string" || Array.isArray(resources.ca))
  ) {
    throw new Error("Widget HTTP trust configuration must be explicit");
  }
  const lifetime = new AbortController();
  const lifetimeSignal = AbortSignal.any([resources.signal, lifetime.signal]);
  const scopes = new AsyncLocalStorage<HttpScope>();
  const pending = new Set<Promise<unknown>>();
  let cleanupFailure: AggregateError | undefined;
  const requireScope = () => {
    const scope = scopes.getStore();
    if (!scope) throw new Error("Widget HTTP execution scope is required");
    if (cleanupFailure) throw cleanupFailure;
    if (scope.endingReason) throw scope.endingReason;
    scope.signal.throwIfAborted();
    return scope;
  };
  const runAsync: WidgetHttpResources["runAsync"] = <T>(
    signal: AbortSignal,
    operation: () => Promise<T>,
  ): Promise<T> => {
    lifetimeSignal.throwIfAborted();
    if (cleanupFailure) throw cleanupFailure;
    signal.throwIfAborted();
    const controller = new AbortController();
    const scope: HttpScope = {
      signal: AbortSignal.any([signal, lifetimeSignal, controller.signal]),
      dispatchers: new Set(),
      responses: new Map(),
      fetches: new Set(),
    };
    const work = scopes.run(scope, async () => {
      let failed = false;
      let firstCleanupFailure: AggregateError | undefined;
      const quarantineFailure = (error: unknown) => {
        if (cleanupFailure) return;
        firstCleanupFailure = new AggregateError([error], "Widget HTTP cleanup failed");
        cleanupFailure = firstCleanupFailure;
      };
      try {
        scope.signal.throwIfAborted();
        const result = await operation();
        scope.signal.throwIfAborted();
        return result;
      } catch (error) {
        failed = true;
        throw error;
      } finally {
        const endingReason = new Error("Widget HTTP scope ended");
        scope.endingReason = endingReason;
        const available = new Set(scope.responses.keys());
        const cancelling = Promise.allSettled(
          [...available]
            .filter((response) => !response.bodyUsed)
            .map(async (response) => {
              try {
                await response.body?.cancel();
              } catch (error) {
                quarantineFailure(error);
                throw error;
              }
            }),
        );
        controller.abort(endingReason);
        const settled = await Promise.allSettled(
          [...scope.dispatchers].map(async (dispatcher) => {
            try {
              await dispatcher.destroy();
              return dispatcher;
            } catch (error) {
              quarantineFailure(error);
              throw error;
            }
          }),
        );
        await Promise.allSettled(scope.fetches);
        const destroyed = new Set(settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])));
        const lateCancelled = await Promise.allSettled(
          [...scope.responses]
            .filter(([response]) => !available.has(response) && !response.bodyUsed)
            .map(async ([response, origin]) => {
              const body = response.body;
              if (!body) return;
              const wasLocked = body.locked;
              try {
                await body.cancel();
              } catch (error) {
                if (
                  !wasLocked &&
                  origin.ownership === "owned" &&
                  destroyed.has(origin.dispatcher) &&
                  scope.signal.aborted &&
                  scope.signal.reason === endingReason &&
                  origin.signal.aborted &&
                  origin.signal.reason === endingReason &&
                  error === endingReason
                )
                  return;
                quarantineFailure(error);
                throw error;
              }
            }),
        );
        const cancelled = await cancelling;
        scope.responses.clear();
        scope.dispatchers.clear();
        const errors = [...cancelled, ...lateCancelled, ...settled].flatMap((result) =>
          result.status === "rejected" ? [result.reason] : [],
        );
        if (errors.length > 0) {
          if (!cleanupFailure || cleanupFailure === firstCleanupFailure) {
            cleanupFailure = new AggregateError(errors, "Widget HTTP cleanup failed");
          }
          if (failed) resources.log.warn("Widget HTTP cleanup failed", { failures: errors.length });
          else throw cleanupFailure;
        }
      }
    });
    pending.add(work);
    void work.then(
      () => pending.delete(work),
      () => pending.delete(work),
    );
    return work;
  };
  const fetchAsync: WidgetHttpResources["fetchAsync"] = (input, options) => {
    const scope = requireScope();
    const work = (async () => {
      const controller = new AbortController();
      const signal = AbortSignal.any([scope.signal, controller.signal, ...(options?.signal ? [options.signal] : [])]);
      const dispatcher =
        options?.dispatcher ??
        new ResourceHttpAgent({
          httpProxy: resources.httpProxy,
          httpsProxy: resources.httpsProxy,
          noProxy: resources.noProxy,
          ...(options?.bodyTimeout !== undefined ? { bodyTimeout: options.bodyTimeout } : {}),
          connect: { ca: resources.ca, checkServerIdentity: resources.checkServerIdentity },
          logger: resources.log,
        });
      if (!options?.dispatcher) scope.dispatchers.add(dispatcher);
      const { timeout, bodyTimeout: _bodyTimeout, dispatcher: _dispatcher, ...fetchOptions } = options ?? {};
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (timeout) {
        timer = setTimeout(() => controller.abort(), timeout);
        timer.unref?.();
      }
      try {
        signal.throwIfAborted();
        const response = await fetch(input, { ...fetchOptions, signal, dispatcher });
        scope.responses.set(response, {
          signal,
          dispatcher,
          ownership: scope.dispatchers.has(dispatcher) ? "owned" : "borrowed",
        });
        return response;
      } finally {
        if (timer) clearTimeout(timer);
      }
    })();
    scope.fetches.add(work);
    void work.then(
      () => scope.fetches.delete(work),
      () => scope.fetches.delete(work),
    );
    return work;
  };
  const createPinnedDispatcherAsync: WidgetHttpResources["createPinnedDispatcherAsync"] = async (input) => {
    const scope = requireScope();
    input.signal.throwIfAborted();
    if (input.httpProxy !== "" || input.httpsProxy !== "" || input.noProxy !== "*") {
      throw new Error("Pinned widget requests require direct transport");
    }
    const dispatcher = new ResourceHttpAgent({
      httpProxy: input.httpProxy,
      httpsProxy: input.httpsProxy,
      noProxy: input.noProxy,
      autoSelectFamily: input.autoSelectFamily,
      bodyTimeout: input.bodyTimeout,
      connect: { ca: resources.ca, checkServerIdentity: resources.checkServerIdentity, lookup: input.lookup },
      logger: resources.log,
    });
    scope.dispatchers.add(dispatcher);
    return dispatcher;
  };
  let closing: Promise<void> | undefined;
  return {
    runAsync,
    fetchAsync,
    createPinnedDispatcherAsync,
    closeAsync: () => {
      closing ??= (async () => {
        lifetime.abort(new Error("Widget HTTP transport is closed"));
        await Promise.allSettled(pending);
        if (cleanupFailure) throw cleanupFailure;
      })();
      return closing;
    },
  };
};
