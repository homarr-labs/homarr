import { createORPCClient, ORPCError } from "@orpc/client";
import type { ClientLink, ClientOptions } from "@orpc/client";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "./root";

export { ORPCError as APIClientError };
export type ApiClientError = ORPCError<
  string,
  {
    zodError?: { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] } | null;
    error?: unknown;
    [key: string]: unknown;
  }
>;
export type ApiClientContext = { operationType?: "query" | "mutation" | "subscription" };
export type NativeRouterClient = RouterClient<AppRouter, ApiClientContext>;
export interface SubscriptionOptions<T> {
  enabled?: boolean;
  signal?: AbortSignal;
  onStarted?: () => void;
  onData?: (data: T) => void;
  onError?: (error: ApiClientError) => void;
  onComplete?: () => void;
  onStopped?: () => void;
}
export type SubscriptionData<T> = T extends AsyncIterable<infer U> ? U : never;
export type ClientInput<T> = T extends (...args: infer A) => unknown ? A[0] : never;
export type ClientOutput<T> = T extends (...args: never[]) => infer O ? Awaited<O> : never;
export type NativeApiClient<T = NativeRouterClient> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown
    ? {
        query: T[K];
        mutate: T[K];
        subscribe(
          input: ClientInput<T[K]>,
          options: SubscriptionOptions<SubscriptionData<ClientOutput<T[K]>>>,
        ): { unsubscribe(): void };
      }
    : NativeApiClient<T[K]>;
};

export interface NativeRequester {
  query(path: string, input?: unknown, options?: { signal?: AbortSignal }): Promise<unknown>;
  mutation(path: string, input?: unknown, options?: { signal?: AbortSignal }): Promise<unknown>;
  subscription(path: string, input: unknown, options: SubscriptionOptions<unknown>): { unsubscribe(): void };
}
const clients = new WeakMap<object, NativeRequester>();
export function getNativeClient(client: NativeApiClient): NativeRequester {
  const request = clients.get(client);
  if (!request) throw new Error("Unknown native API client");
  return request;
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

const retryableSubscriptionCodes = new Set([
  "TIMEOUT",
  "TOO_MANY_REQUESTS",
  "INTERNAL_SERVER_ERROR",
  "BAD_GATEWAY",
  "SERVICE_UNAVAILABLE",
  "GATEWAY_TIMEOUT",
]);
const maxSubscriptionRetries = 5;

function isTransientSubscriptionError(error: unknown): boolean {
  if (error instanceof ORPCError) return retryableSubscriptionCodes.has(error.code);
  return error instanceof Error && error.name !== "AbortError";
}

export function createNativeApiClient({ link }: { link: ClientLink<ApiClientContext> }): NativeApiClient {
  // oRPC owns the request encoding, native values, errors and cancellation.
  const native = createORPCClient<NativeRouterClient>({
    async call(path, input, options) {
      return link.call(path, nativeInput(input), options);
    },
  });
  const call = (path: string, input: unknown, options: ClientOptions<ApiClientContext>) => {
    let procedure: unknown = native;
    for (const part of path.split(".")) procedure = (procedure as Record<string, unknown>)[part];
    return (procedure as (input: unknown, options: ClientOptions<ApiClientContext>) => Promise<unknown>)(
      input,
      options,
    );
  };
  const requester: NativeRequester = {
    query: (path, input, options) => call(path, input, { ...options, context: { operationType: "query" } }),
    mutation: (path, input, options) => call(path, input, { ...options, context: { operationType: "mutation" } }),
    subscription(path, input, options) {
      const abort = new AbortController();
      let active = true;
      let iterator: AsyncIterator<unknown> | undefined;
      let retryTimer: ReturnType<typeof setTimeout> | undefined;
      let resumeRetry: (() => void) | undefined;
      const closeIterator = () => {
        const current = iterator;
        iterator = undefined;
        void Promise.resolve(current?.return?.()).catch(() => undefined);
      };
      const release = () => {
        if (!active) return;
        active = false;
        abort.abort();
        options.signal?.removeEventListener("abort", cancelled);
        if (retryTimer !== undefined) clearTimeout(retryTimer);
        resumeRetry?.();
        closeIterator();
      };
      const cancelled = () => {
        release();
        options.onError?.(options.signal?.reason as ApiClientError);
      };
      options.signal?.addEventListener("abort", cancelled, { once: true });
      if (options.signal?.aborted) cancelled();
      if (active)
        void (async () => {
          let failures = 0;
          try {
            // Unsubscribe and caller abort mutate active while requests or retry delays are pending.
            // eslint-disable-next-line no-unmodified-loop-condition
            while (active) {
              let callbackFailed = false;
              const notify = (callback: () => void) => {
                callbackFailed = true;
                callback();
                callbackFailed = false;
              };
              try {
                const result = await call(path, input, {
                  signal: abort.signal,
                  context: { operationType: "subscription" },
                });
                if (!active) return;
                if (!result || typeof result !== "object" || !(Symbol.asyncIterator in result))
                  throw new ORPCError("BAD_REQUEST", { message: "The API did not return a subscription." });
                iterator = (result as AsyncIterable<unknown>)[Symbol.asyncIterator]();
                notify(() => options.onStarted?.());
                // Unsubscribe clears the iterator while its next event is pending.
                // eslint-disable-next-line no-unmodified-loop-condition
                while (active && iterator) {
                  const event = await iterator.next();
                  if (!active || event.done) break;
                  failures = 0;
                  notify(() => options.onData?.(event.value));
                }
                if (active) {
                  notify(() => options.onStopped?.());
                  notify(() => options.onComplete?.());
                }
                return;
              } catch (error) {
                if (!active) return;
                closeIterator();
                if (callbackFailed || !isTransientSubscriptionError(error) || failures >= maxSubscriptionRetries) {
                  options.onError?.(error as ApiClientError);
                  return;
                }
                // Retry transport outages, but never replay terminal authorization or input failures.
                const delay = Math.min(250 * 2 ** failures, 4_000);
                failures++;
                await new Promise<void>((resolve) => {
                  resumeRetry = resolve;
                  retryTimer = setTimeout(resolve, delay);
                });
                retryTimer = undefined;
                resumeRetry = undefined;
              }
            }
          } finally {
            release();
          }
        })();
      return { unsubscribe: release };
    },
  };
  function branch(path: string[]): unknown {
    return new Proxy(() => {}, {
      get(_target, property) {
        if (property === "then") return undefined;
        if (property === "query")
          return (input: unknown, options?: { signal?: AbortSignal }) =>
            requester.query(path.join("."), input, options);
        if (property === "mutate")
          return (input: unknown, options?: { signal?: AbortSignal }) =>
            requester.mutation(path.join("."), input, options);
        if (property === "subscribe")
          return (input: unknown, options: SubscriptionOptions<unknown>) =>
            requester.subscription(path.join("."), input, options);
        return branch([...path, String(property)]);
      },
    });
  }
  const client = branch([]) as NativeApiClient;
  clients.set(client, requester);
  return client;
}
