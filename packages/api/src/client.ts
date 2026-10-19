"use client";

import { createContext, createElement, useContext, useEffect, useRef } from "react";
import type { PropsWithChildren } from "react";
import {
  skipToken,
  useQuery,
  useSuspenseQuery,
  useMutation,
  useInfiniteQuery,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  QueryClient,
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
  DefinedUseQueryResult,
  UseSuspenseQueryOptions,
  UseSuspenseQueryResult,
  UseMutationOptions,
  UseMutationResult,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  InfiniteData,
  InvalidateQueryFilters,
  RefetchQueryFilters,
  CancelOptions,
  SetDataOptions,
  Updater,
} from "@tanstack/react-query";
import { RPCLink } from "@orpc/client/fetch";
import type { ClientLink } from "@orpc/client";

import { createNativeApiClient, getNativeClient } from "./native-client";
import type {
  NativeApiClient,
  NativeRouterClient,
  ClientInput,
  ClientOutput,
  SubscriptionData,
  SubscriptionOptions,
  ApiClientContext,
  ApiClientError,
} from "./native-client";
import { createWorkerLink, hasWorkerTransport } from "./worker-link";
import { createHeadersCallbackForSource } from "./shared";
export { APIClientError } from "./native-client";
export type { ApiClientError, NativeApiClient } from "./native-client";

const procedurePath = Symbol("homarr.api.path");
type ProcedurePath = { readonly [procedurePath]: string[] };
type QueryType = "query" | "infinite" | "any";
export function getQueryKey(procedure: unknown, input?: unknown, type: QueryType = "any"): QueryKey {
  const path = (procedure as ProcedurePath)[procedurePath];
  if (input === undefined && type === "any") return path.length ? [path] : [];
  const details: { input?: unknown; type?: "query" | "infinite" } = {};
  if (input !== undefined) details.input = input;
  if (type !== "any") details.type = type;
  return [path, details];
}
function key(path: string[], input?: unknown, type: QueryType = "any") {
  return getQueryKey({ [procedurePath]: path }, input, type);
}

const hosted = new RPCLink<ApiClientContext>({
  url: "/rpc",
  origin: () => {
    if (typeof window !== "undefined") return window.location.origin;
    return process.env.HOMARR_BACKEND_URL ?? "http://127.0.0.1:3002";
  },
  method: "POST",
  headers: createHeadersCallbackForSource("fetch"),
});
const worker = createWorkerLink();
const defaultLink: ClientLink<ApiClientContext> = {
  call(path, input, options) {
    if (hasWorkerTransport()) return worker.call(path, input, options);
    return hosted.call(path, input, options);
  },
};
export const fetchApi = createNativeApiClient({ link: defaultLink });
const FetchApiContext = createContext<NativeApiClient | null>(null);
export const FetchApiProvider = FetchApiContext.Provider;
export function useScopedFetchApi(): NativeApiClient {
  return useContext(FetchApiContext) ?? fetchApi;
}

export type ApiQueryOptions<O, D = O> = Omit<UseQueryOptions<O, ApiClientError, D>, "queryKey" | "queryFn">;
type ApiSuspenseOptions<O, D = O> = Omit<UseSuspenseQueryOptions<O, ApiClientError, D>, "queryKey" | "queryFn">;
type ApiMutationOptions<I, O, C = unknown> = Omit<
  UseMutationOptions<O, ApiClientError, I, C>,
  "mutationKey" | "mutationFn"
>;
interface ProcedureHooks<I, O> extends ProcedurePath {
  useQuery<D = O>(
    input: I | typeof skipToken,
    options: ApiQueryOptions<O, D> & { initialData: O | (() => O) },
  ): DefinedUseQueryResult<D, ApiClientError>;
  useQuery<D = O>(input?: I | typeof skipToken, options?: ApiQueryOptions<O, D>): UseQueryResult<D, ApiClientError>;
  useSuspenseQuery<D = O>(
    input?: I,
    options?: ApiSuspenseOptions<O, D>,
  ): [D, UseSuspenseQueryResult<D, ApiClientError>];
  useMutation<C = unknown>(options?: ApiMutationOptions<I, O, C>): UseMutationResult<O, ApiClientError, I, C>;
  useInfiniteQuery<D = InfiniteData<O>>(
    input?: I,
    options?: Omit<UseInfiniteQueryOptions<O, ApiClientError, D>, "queryKey" | "queryFn" | "initialPageParam"> & {
      initialCursor?: unknown;
    },
  ): UseInfiniteQueryResult<D, ApiClientError>;
  useSubscription(input: I | typeof skipToken, options: SubscriptionOptions<SubscriptionData<O>>): void;
}
type Hooks<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown
    ? ProcedureHooks<ClientInput<T[K]>, ClientOutput<T[K]>>
    : Hooks<T[K]> & ProcedurePath;
};
type QuerySpec<O> = { queryKey: QueryKey; queryFn: (context: { signal: AbortSignal }) => Promise<O> };
type QueryBuilder<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown
    ? <D = ClientOutput<T[K]>>(
        input?: ClientInput<T[K]>,
        options?: ApiQueryOptions<ClientOutput<T[K]>, D>,
      ) => QuerySpec<D>
    : QueryBuilder<T[K]>;
};
interface ProcedureUtils<I, O> {
  fetch(input?: I, options?: ApiQueryOptions<O>): Promise<O>;
  prefetch(input?: I, options?: ApiQueryOptions<O>): Promise<void>;
  ensureData(input?: I, options?: ApiQueryOptions<O>): Promise<O>;
  getData(input?: I): O | undefined;
  setData(
    input: I | undefined,
    updater: Updater<O | undefined, O | undefined>,
    options?: SetDataOptions,
  ): O | undefined;
  getInfiniteData(input?: I): InfiniteData<O> | undefined;
  setInfiniteData(
    input: I | undefined,
    updater: Updater<InfiniteData<O> | undefined, InfiniteData<O> | undefined>,
    options?: SetDataOptions,
  ): InfiniteData<O> | undefined;
}
interface BranchUtils<I = unknown> {
  invalidate(
    input?: Partial<I>,
    filters?: InvalidateQueryFilters,
    options?: { cancelRefetch?: boolean; throwOnError?: boolean },
  ): Promise<void>;
  refetch(
    input?: Partial<I>,
    filters?: RefetchQueryFilters,
    options?: { cancelRefetch?: boolean; throwOnError?: boolean },
  ): Promise<void>;
  cancel(input?: Partial<I>, options?: CancelOptions): Promise<void>;
  reset(input?: Partial<I>): Promise<void>;
}
type Utils<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown
    ? ProcedureUtils<ClientInput<T[K]>, ClientOutput<T[K]>> & BranchUtils<ClientInput<T[K]>>
    : Utils<T[K]> & BranchUtils;
};

function useRequest() {
  return getNativeClient(useScopedFetchApi());
}
function hooks(path: string[]): unknown {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (Reflect.has(_target, property)) return Reflect.get(_target, property);
        if (property === procedurePath) return path;
        if (property === "useQuery")
          return (input: unknown, options: object = {}) => {
            const request = useRequest();
            return useQuery({
              ...options,
              queryKey: key(path, input, "query"),
              queryFn:
                input === skipToken ? skipToken : ({ signal }) => request.query(path.join("."), input, { signal }),
            });
          };
        if (property === "useSuspenseQuery")
          return (input: unknown, options: object = {}) => {
            const request = useRequest();
            const result = useSuspenseQuery({
              ...options,
              queryKey: key(path, input, "query"),
              queryFn: ({ signal }) => request.query(path.join("."), input, { signal }),
            });
            return [result.data, result];
          };
        if (property === "useMutation")
          return (options: object = {}) => {
            const request = useRequest();
            return useMutation({
              ...options,
              mutationKey: [path],
              mutationFn: (input: unknown) => request.mutation(path.join("."), input),
            });
          };
        if (property === "useInfiniteQuery")
          return (input: unknown, options: { initialCursor?: unknown; getNextPageParam: () => unknown }) => {
            const request = useRequest();
            const { initialCursor, ...rest } = options;
            return useInfiniteQuery({
              ...rest,
              queryKey: key(path, input, "infinite"),
              initialPageParam: initialCursor ?? null,
              queryFn: ({ signal, pageParam, direction }) =>
                request.query(path.join("."), { ...(input as object), cursor: pageParam, direction }, { signal }),
            });
          };
        if (property === "useSubscription")
          return (input: unknown, options: SubscriptionOptions<unknown>) => {
            const request = useRequest();
            const callbacks = useRef(options);
            callbacks.current = options;
            const subscriptionInput = useRef(input);
            subscriptionInput.current = input;
            const enabled = input !== skipToken && options.enabled !== false;
            const signal = options.signal;
            const subscriptionPath = path.join(".");
            // Hash using the same native input values as the query cache, without callback identities.
            const inputKey = stableInputKey(input);
            useEffect(() => {
              if (!enabled) return;
              const subscription = request.subscription(subscriptionPath, subscriptionInput.current, {
                signal,
                onData: (value) => callbacks.current.onData?.(value),
                onError: (error) => callbacks.current.onError?.(error),
                onStarted: () => callbacks.current.onStarted?.(),
                onStopped: () => callbacks.current.onStopped?.(),
                onComplete: () => callbacks.current.onComplete?.(),
              });
              return () => subscription.unsubscribe();
            }, [request, inputKey, enabled, signal, subscriptionPath]);
          };
        return hooks([...path, String(property)]);
      },
    },
  );
}
function stableInputKey(value: unknown): string {
  return (
    JSON.stringify(value, (_key, current: unknown) => {
      if (typeof current === "bigint") return { $bigint: String(current) };
      if (
        current &&
        typeof current === "object" &&
        !Array.isArray(current) &&
        Object.getPrototypeOf(current) === Object.prototype
      )
        return Object.fromEntries(Object.entries(current).toSorted(([a], [b]) => a.localeCompare(b)));
      return current;
    }) ?? "undefined"
  );
}
function queryBuilder(path: string[], request: ReturnType<typeof useRequest>): unknown {
  return new Proxy(() => {}, {
    get: (_target, property) => queryBuilder([...path, String(property)], request),
    apply: (_target, _this, [input, options = {}]) => ({
      ...options,
      queryKey: key(path, input, "query"),
      queryFn: ({ signal }: { signal: AbortSignal }) => request.query(path.join("."), input, { signal }),
    }),
  });
}
function utils(
  path: string[],
  queryClient: QueryClient,
  request: ReturnType<typeof useRequest>,
  client: NativeApiClient,
): unknown {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "client" && path.length === 0) return client;
        if (["invalidate", "refetch", "cancel", "reset"].includes(String(property)))
          return (input?: unknown, filters: object = {}, options?: object) => {
            const queryKey = key(path, input);
            if (property === "invalidate") return queryClient.invalidateQueries({ ...filters, queryKey }, options);
            if (property === "refetch") return queryClient.refetchQueries({ ...filters, queryKey }, options);
            if (property === "cancel") return queryClient.cancelQueries({ queryKey }, filters);
            return queryClient.resetQueries({ ...filters, queryKey }, options);
          };
        if (["fetch", "prefetch", "ensureData"].includes(String(property)))
          return (input?: unknown, options: object = {}) => {
            const queryOptions = {
              ...options,
              queryKey: key(path, input, "query"),
              queryFn: ({ signal }: { signal: AbortSignal }) => request.query(path.join("."), input, { signal }),
            };
            if (property === "fetch") return queryClient.fetchQuery(queryOptions);
            if (property === "prefetch") return queryClient.prefetchQuery(queryOptions);
            return queryClient.ensureQueryData(queryOptions);
          };
        if (property === "getData" || property === "getInfiniteData")
          return (input?: unknown) =>
            queryClient.getQueryData(key(path, input, property === "getData" ? "query" : "infinite"));
        if (property === "setData" || property === "setInfiniteData")
          return (input: unknown, updater: Updater<unknown, unknown>, options?: SetDataOptions) =>
            queryClient.setQueryData(key(path, input, property === "setData" ? "query" : "infinite"), updater, options);
        return utils([...path, String(property)], queryClient, request, client);
      },
    },
  );
}
export const clientApi = Object.assign(hooks([]) as Hooks<NativeRouterClient>, {
  createClient: createNativeApiClient,
  Provider({ client, children }: PropsWithChildren<{ client: NativeApiClient; queryClient?: QueryClient }>) {
    return createElement(FetchApiProvider, { value: client }, children);
  },
  useUtils(): Utils<NativeRouterClient> & BranchUtils & { client: NativeApiClient } {
    const client = useScopedFetchApi();
    return utils([], useQueryClient(), getNativeClient(client), client) as Utils<NativeRouterClient> &
      BranchUtils & { client: NativeApiClient };
  },
  useQueries<T extends readonly QuerySpec<unknown>[]>(
    build: (builder: QueryBuilder<NativeRouterClient>) => T,
  ): { [K in keyof T]: T[K] extends QuerySpec<infer O> ? UseQueryResult<O, ApiClientError> : never } {
    const request = useRequest();
    const queries = build(queryBuilder([], request) as QueryBuilder<NativeRouterClient>);
    return useQueries({ queries: [...queries] }) as {
      [K in keyof T]: T[K] extends QuerySpec<infer O> ? UseQueryResult<O, ApiClientError> : never;
    };
  },
});
