"use client";

import type { ClientLink } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ApiClientContext } from "./native-client";
import { requestBrowserWeatherAsync } from "./browser-weather";

/** Only the browser transport is shared; native routers and handlers are never imported. */
export interface WorkerFetch {
  /** Explicitly allow public Open-Meteo reads in browsers for an offline worker. */
  browserWeather?: boolean;
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
  fetchSubscription?(input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

export type WorkerTransportResolver = () => WorkerFetch;
let configuredTransport: WorkerTransportResolver | null = null;

/** A configured resolver fails closed when offline, rather than falling back to hosted HTTP. */
export function configureWorkerTransport(resolve: WorkerTransportResolver | null): () => void {
  configuredTransport = resolve;
  return () => {
    if (configuredTransport === resolve) configuredTransport = null;
  };
}

export function hasWorkerTransport(): boolean {
  return configuredTransport !== null;
}

export function getWorkerTransport(): WorkerFetch {
  if (!configuredTransport) throw new Error("No worker connection is selected.");
  return configuredTransport();
}

// Canonicalize only values whose native encoding is unambiguous. Unsupported
// inputs keep independent streams rather than risk joining distinct requests.
function subscriptionKey(path: string, input: unknown): string | undefined {
  const ancestors = new Set<object>();
  function encode(value: unknown): unknown {
    if (value === null) return ["null"];
    if (typeof value === "undefined") return ["undefined"];
    if (typeof value === "string" || typeof value === "boolean") return [typeof value, value];
    if (typeof value === "bigint") return ["bigint", String(value)];
    if (typeof value === "number") {
      if (Object.is(value, -0)) return ["number", "-0"];
      return ["number", String(value)];
    }
    if (typeof value !== "object" || ancestors.has(value)) throw new Error("Unshareable input");
    if (value instanceof Date) return ["date", value.toISOString()];
    ancestors.add(value);
    try {
      if (Array.isArray(value)) return ["array", Array.from(value, encode)];
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) throw new Error("Unshareable input");
      return [
        "object",
        Object.keys(value)
          .toSorted()
          .map((key) => [key, encode((value as Record<string, unknown>)[key])]),
      ];
    } finally {
      ancestors.delete(value);
    }
  }
  try {
    return JSON.stringify([path, encode(input)]);
  } catch {
    return undefined;
  }
}

interface Listener {
  queue: unknown[];
  pending?: { resolve(value: IteratorResult<unknown>): void; reject(error: unknown): void };
  done: boolean;
  error?: unknown;
}
interface SharedSubscription {
  listeners: Set<Listener>;
  abort: AbortController;
  iterator?: AsyncIterator<unknown>;
  latest?: unknown;
  hasLatest: boolean;
  finished: boolean;
}

/** Native oRPC transport bound to the selected worker for the entire call. */
export function createWorkerLink(
  connection: WorkerFetch | WorkerTransportResolver = getWorkerTransport,
): ClientLink<ApiClientContext> {
  const workers = new WeakMap<WorkerFetch, Map<string, SharedSubscription>>();
  return {
    async call(path, input, options) {
      const selected = typeof connection === "function" ? connection() : connection;
      const native = new RPCLink<ApiClientContext>({
        url: "/rpc",
        method: "POST",
        fetch: (url, init) => {
          if (options.context.operationType === "subscription" && selected.fetchSubscription)
            return selected.fetchSubscription(url, init);
          return selected.fetch(url, init);
        },
      });
      if (options.context.operationType !== "subscription") {
        let result = await native.call(path, input, options);
        if (options.context.operationType === "query" && result === null && selected.browserWeather === true)
          result = await requestBrowserWeatherAsync(
            path.join("."),
            input,
            options.signal ?? new AbortController().signal,
          );
        return result;
      }
      options.signal?.throwIfAborted();
      const key = subscriptionKey(path.join("."), input);
      let streams = workers.get(selected);
      if (!streams) {
        streams = new Map();
        workers.set(selected, streams);
      }
      let shared = key === undefined ? undefined : streams.get(key);
      const existing = shared !== undefined;
      if (!shared) {
        shared = { listeners: new Set(), abort: new AbortController(), hasLatest: false, finished: false };
        if (key !== undefined) streams.set(key, shared);
      }
      const entry = shared;
      const listener: Listener = { queue: [], done: false };
      if (entry.hasLatest) listener.queue.push(structuredClone(entry.latest));
      entry.listeners.add(listener);
      function finish(error?: unknown) {
        if (listener.done) return;
        listener.done = true;
        listener.error = error;
        options.signal?.removeEventListener("abort", cancelled);
        entry.listeners.delete(listener);
        if (listener.pending) {
          if (error !== undefined) listener.pending.reject(error);
          else listener.pending.resolve({ done: true, value: undefined });
          listener.pending = undefined;
        }
        if (entry.listeners.size !== 0) return;
        if (key !== undefined && streams?.get(key) === entry) streams.delete(key);
        entry.abort.abort();
        void Promise.resolve(entry.iterator?.return?.()).catch(() => undefined);
      }
      const cancelled = () => finish(options.signal?.reason);
      options.signal?.addEventListener("abort", cancelled, { once: true });
      if (!existing)
        void (async () => {
          try {
            const result = await native.call(path, input, { ...options, signal: entry.abort.signal });
            if (!result || typeof result !== "object" || !(Symbol.asyncIterator in result))
              throw new Error("The worker did not return a subscription.");
            entry.iterator = (result as AsyncIterable<unknown>)[Symbol.asyncIterator]();
            while (!entry.abort.signal.aborted) {
              const event = await entry.iterator.next();
              if (event.done) break;
              entry.latest = structuredClone(event.value);
              entry.hasLatest = true;
              for (const current of entry.listeners) {
                const value = structuredClone(event.value);
                if (current.pending) {
                  current.pending.resolve({ done: false, value });
                  current.pending = undefined;
                } else current.queue.push(value);
              }
            }
            entry.finished = true;
            for (const current of entry.listeners) {
              current.pending?.resolve({ done: true, value: undefined });
              current.pending = undefined;
            }
          } catch (error) {
            entry.finished = true;
            for (const current of entry.listeners) {
              current.error = error;
              current.pending?.reject(error);
              current.pending = undefined;
            }
          } finally {
            if (key !== undefined && streams?.get(key) === entry) streams.delete(key);
          }
        })();
      return {
        [Symbol.asyncIterator]() {
          return this;
        },
        async next(): Promise<IteratorResult<unknown>> {
          if (listener.error !== undefined) throw listener.error;
          if (listener.done) return { done: true, value: undefined };
          if (listener.queue.length) return { done: false, value: listener.queue.shift() };
          if (entry.finished) {
            finish();
            return { done: true, value: undefined };
          }
          return new Promise((resolve, reject) => {
            listener.pending = { resolve, reject };
          });
        },
        async return(): Promise<IteratorResult<unknown>> {
          finish();
          return { done: true, value: undefined };
        },
      };
    },
  };
}
