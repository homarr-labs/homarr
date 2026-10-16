"use client";

import { COMMON_ERROR_STATUS_MAP, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { TRPCClientError } from "@trpc/client";
import type { Operation, OperationResultEnvelope, OperationResultObservable, TRPCLink } from "@trpc/client";
import type { Observer, Unsubscribable } from "@trpc/server/observable";
import { observable } from "@trpc/server/observable";
import { TRPC_ERROR_CODES_BY_KEY } from "@trpc/server/unstable-core-do-not-import";

import type { AppRouter } from "./legacy";
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

function clientError(error: unknown, path: string): TRPCClientError<AppRouter> {
  if (!(error instanceof ORPCError)) {
    if (error instanceof Error) return TRPCClientError.from(error);
    return TRPCClientError.from(new Error("The worker request failed."));
  }
  let code: keyof typeof TRPC_ERROR_CODES_BY_KEY = "INTERNAL_SERVER_ERROR";
  if (Object.hasOwn(TRPC_ERROR_CODES_BY_KEY, error.code)) code = error.code as typeof code;
  const details = error.data as Record<string, unknown> | undefined;
  return TRPCClientError.from({
    error: {
      message: error.message,
      code: TRPC_ERROR_CODES_BY_KEY[code],
      data: {
        code,
        httpStatus: COMMON_ERROR_STATUS_MAP[code],
        path,
        zodError: details?.zodError ?? null,
        error: details?.error ?? null,
      },
    },
  });
}

function nativeInput(input: unknown): unknown {
  if (!(input instanceof FormData)) return input;
  // oRPC encodes File values inside records as multipart fields. Top-level
  // FormData is otherwise treated as an empty JSON object by the beta codec.
  const fields = Object.create(null) as Record<string, FormDataEntryValue | FormDataEntryValue[]>;
  for (const [name, value] of input.entries()) {
    if (name === "__proto__" || name === "constructor" || name === "prototype")
      throw new TypeError("Unsafe form field");
    if (!Object.hasOwn(fields, name)) fields[name] = value;
    else {
      const previous = fields[name];
      if (Array.isArray(previous)) previous.push(value);
      else if (previous !== undefined) fields[name] = [previous, value];
    }
  }
  return fields;
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
          .sort()
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

type WorkerResult = OperationResultEnvelope<unknown, TRPCClientError<AppRouter>>;
type WorkerObserver = Observer<WorkerResult, TRPCClientError<AppRouter>>;
interface SharedSubscription {
  observers: Set<WorkerObserver>;
  source?: Unsubscribable;
  started: boolean;
  latest?: WorkerResult;
}

/** Source compatibility for existing hooks; the wire protocol is exclusively native oRPC. */
export function createWorkerLink(
  connection: WorkerFetch | WorkerTransportResolver = getWorkerTransport,
): TRPCLink<AppRouter> {
  return () => {
    // Each client lifecycle and actual worker connection has its own streams.
    const workers = new WeakMap<WorkerFetch, Map<string, SharedSubscription>>();
    return ({ op }) =>
      observable<WorkerResult, TRPCClientError<AppRouter>>((observer) => {
        let selected: WorkerFetch;
        try {
          selected = typeof connection === "function" ? connection() : connection;
        } catch (error) {
          observer.error(clientError(error, op.path));
          return;
        }
        const key = subscriptionKey(op.path, op.input);
        if (op.type !== "subscription" || key === undefined) return workerRequest(selected, op).subscribe(observer);
        if (op.signal?.aborted) {
          observer.error(clientError(op.signal.reason, op.path));
          return;
        }
        let streams = workers.get(selected);
        if (!streams) {
          streams = new Map();
          workers.set(selected, streams);
        }
        let shared = streams.get(key);
        const existing = shared !== undefined;
        if (!shared) {
          shared = { observers: new Set(), started: false };
          streams.set(key, shared);
        }
        const entry = shared;
        entry.observers.add(observer);
        const release = () => {
          op.signal?.removeEventListener("abort", abortListener);
          entry.observers.delete(observer);
          if (entry.observers.size !== 0) return;
          if (streams.get(key) === entry) streams.delete(key);
          entry.source?.unsubscribe();
        };
        const abortListener = () => {
          release();
          observer.error(clientError(op.signal?.reason, op.path));
        };
        op.signal?.addEventListener("abort", abortListener, { once: true });
        if (entry.started) observer.next({ result: { type: "started" } });
        if (entry.latest) observer.next(structuredClone(entry.latest));
        if (!existing) {
          // A listener's signal must never cancel another listener's stream.
          entry.source = workerRequest(selected, { ...op, signal: null }).subscribe({
            next(value) {
              if ("type" in value.result && value.result.type === "started") entry.started = true;
              if ("type" in value.result && value.result.type === "data") entry.latest = structuredClone(value);
              for (const listener of [...entry.observers]) listener.next(structuredClone(value));
            },
            error(error) {
              if (streams.get(key) === entry) streams.delete(key);
              for (const listener of [...entry.observers]) listener.error(error);
            },
            complete() {
              if (streams.get(key) === entry) streams.delete(key);
              for (const listener of [...entry.observers]) listener.complete();
            },
          });
        }
        return release;
      });
  };
}

function workerRequest(selected: WorkerFetch, op: Operation): OperationResultObservable<AppRouter, unknown> {
  return observable((observer) => {
    const abort = new AbortController();
    let active = true;
    let iterator: AsyncIterator<unknown> | undefined;
    const abortFromCaller = () => abort.abort(op.signal?.reason);
    op.signal?.addEventListener("abort", abortFromCaller, { once: true });
    if (op.signal?.aborted) abortFromCaller();
    const native = new RPCLink({
      url: "/rpc",
      method: "POST",
      fetch: (url, init) => {
        if (op.type === "subscription" && selected.fetchSubscription) return selected.fetchSubscription(url, init);
        return selected.fetch(url, init);
      },
    });
    void (async () => {
      try {
        let result = await native.call(op.path.split("."), nativeInput(op.input), {
          signal: abort.signal,
          context: {},
        });
        if (!active) return;
        if (op.type === "query" && result === null && selected.browserWeather === true) {
          result = await requestBrowserWeatherAsync(op.path, op.input, abort.signal);
          if (!active) return;
        }
        if (op.type !== "subscription") {
          observer.next({ result: { type: "data", data: result } });
          observer.complete();
          return;
        }
        if (!result || typeof result !== "object" || !(Symbol.asyncIterator in result))
          throw new Error("The worker did not return a subscription.");
        iterator = (result as AsyncIterable<unknown>)[Symbol.asyncIterator]();
        observer.next({ result: { type: "started" } });
        while (true) {
          if (!active) break;
          const event = await iterator.next();
          if (!active || event.done) break;
          observer.next({ result: { type: "data", data: event.value } });
        }
        if (active) {
          observer.next({ result: { type: "stopped" } });
          observer.complete();
        }
      } catch (error) {
        if (active) observer.error(clientError(error, op.path));
      } finally {
        op.signal?.removeEventListener("abort", abortFromCaller);
      }
    })();
    return () => {
      active = false;
      abort.abort();
      op.signal?.removeEventListener("abort", abortFromCaller);
      void Promise.resolve(iterator?.return?.()).catch(() => undefined);
    };
  });
}
