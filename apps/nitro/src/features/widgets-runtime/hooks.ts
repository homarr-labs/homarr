import { useContext, useEffect, useMemo, useRef } from "react";
import { consumeAsyncIterator } from "@orpc/client";
import { hashKey, skipToken, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type {
  QueryClient,
  QueryKey,
  Updater,
  UseMutationOptions,
  UseQueryOptions,
  UseQueryResult,
  UseSuspenseQueryResult,
} from "@tanstack/react-query";

import {
  queryCacheDefaultGcTimeMs,
  queryCacheDefaultRefetchIntervalMs,
  queryCacheDefaultStaleTimeMs,
} from "@homarr/api/query-cache";
import { widgetQueryRefetchIntervals } from "@homarr/widgets/refetch-intervals";

import { useWidgetTransport, WidgetQueryScopeContext } from "./context";
import { getQueryKey, getScopedWidgetQueryKey } from "./query-key";
import { isTrpcForbiddenError } from "./query-state";
import type { WidgetRpcClient } from "./transport";

type NativeCall<TInput, TOutput> = (input: TInput, options?: { signal?: AbortSignal }) => Promise<TOutput>;
export type NativeWidgetQueryOptions<TOutput> = Omit<
  UseQueryOptions<TOutput, Error, TOutput, QueryKey>,
  "queryFn" | "queryKey"
>;

function useRegisterWidgetQuery(key: QueryKey) {
  const scope = useContext(WidgetQueryScopeContext);
  const stableKey = useMemo(() => key, [hashKey(key)]);
  scope?.record(stableKey);
  useEffect(() => scope?.register(stableKey), [scope, stableKey]);
  return scope;
}

function getWidgetQueryPolicy(path: readonly string[]) {
  const policy = widgetQueryRefetchIntervals.findLast(({ queryKey }) =>
    queryKey[0].every((part, index) => path[index] === part),
  );
  const staleTime =
    policy && "staleTimeSeconds" in policy ? policy.staleTimeSeconds * 1000 : queryCacheDefaultStaleTimeMs;
  const refetchInterval: number | false = policy
    ? policy.intervalSeconds === null
      ? false
      : policy.intervalSeconds * 1000
    : queryCacheDefaultRefetchIntervalMs;
  return { staleTime, refetchInterval, gcTime: queryCacheDefaultGcTimeMs };
}

export function createNativeWidgetQuery<TInput, TOutput>(
  path: readonly string[],
  select: (client: WidgetRpcClient) => NativeCall<TInput, TOutput>,
) {
  const procedure = {
    path,
    options(
      client: WidgetRpcClient,
      cacheScope: string,
      input: TInput,
      options?: NativeWidgetQueryOptions<TOutput>,
    ): UseQueryOptions<TOutput, Error, TOutput, QueryKey> {
      return {
        ...getWidgetQueryPolicy(path),
        ...options,
        queryKey: getScopedWidgetQueryKey(procedure, input, cacheScope),
        queryFn: ({ signal }: { signal: AbortSignal }) => select(client)(input, { signal }),
      };
    },
    useQuery(input: TInput, options?: NativeWidgetQueryOptions<TOutput>): UseQueryResult<TOutput, Error> {
      const { client, cacheScope } = useWidgetTransport();
      const key = getScopedWidgetQueryKey(procedure, input, cacheScope);
      const scope = useRegisterWidgetQuery(key);
      const query = useQuery({
        ...procedure.options(client, cacheScope, input, options),
        ...(scope?.polling === false ? { refetchInterval: false } : {}),
      });
      if (isTrpcForbiddenError(query.error)) throw query.error;
      return query;
    },
    useSuspenseQuery(input: TInput): readonly [TOutput, UseSuspenseQueryResult<TOutput, Error>] {
      const { client, cacheScope } = useWidgetTransport();
      const key = getScopedWidgetQueryKey(procedure, input, cacheScope);
      const scope = useRegisterWidgetQuery(key);
      const query = useSuspenseQuery({
        ...getWidgetQueryPolicy(path),
        queryKey: key,
        queryFn: ({ signal }) => select(client)(input, { signal }),
        ...(scope?.polling === false ? { refetchInterval: false } : {}),
      });
      if (isTrpcForbiddenError(query.error)) throw query.error;
      return [query.data, query];
    },
    utilities(queryClient: QueryClient, cacheScope: string, client: WidgetRpcClient) {
      const queryKey = (input?: TInput) =>
        input === undefined
          ? getQueryKey(procedure, undefined, "any")
          : getScopedWidgetQueryKey(procedure, input, cacheScope);
      const predicate = (key: QueryKey) => {
        const authority = key[2];
        return (
          typeof authority === "object" &&
          authority !== null &&
          "cacheScope" in authority &&
          authority.cacheScope === cacheScope
        );
      };
      return {
        invalidate: (input?: TInput) =>
          queryClient.invalidateQueries({ queryKey: queryKey(input), predicate: (query) => predicate(query.queryKey) }),
        cancel: (input?: TInput) =>
          queryClient.cancelQueries({ queryKey: queryKey(input), predicate: (query) => predicate(query.queryKey) }),
        getData: (input: TInput) => queryClient.getQueryData<TOutput>(queryKey(input)),
        setData: (input: TInput, value: Updater<TOutput | undefined, TOutput | undefined>) =>
          queryClient.setQueryData<TOutput>(queryKey(input), value),
        fetch: (input: TInput) => queryClient.fetchQuery(procedure.options(client, cacheScope, input)),
      };
    },
  };
  return procedure;
}

export function createNativeWidgetMutation<TInput, TOutput>(
  path: readonly string[],
  select: (client: WidgetRpcClient) => NativeCall<TInput, TOutput>,
) {
  return {
    path,
    useMutation(options?: Omit<UseMutationOptions<TOutput, Error, TInput>, "mutationFn" | "mutationKey">) {
      const { client, cacheScope } = useWidgetTransport();
      const controllers = useRef(new Set<AbortController>());
      useEffect(
        () => () => {
          for (const controller of controllers.current) controller.abort();
          controllers.current.clear();
        },
        [client, cacheScope],
      );
      return useMutation({
        ...options,
        retry: false,
        mutationKey: [path, { cacheScope }],
        mutationFn: async (input) => {
          const controller = new AbortController();
          controllers.current.add(controller);
          try {
            return await select(client)(input, { signal: controller.signal });
          } finally {
            controllers.current.delete(controller);
          }
        },
      });
    },
    mutate(client: WidgetRpcClient, input: TInput, options?: { signal?: AbortSignal }) {
      return select(client)(input, options);
    },
  };
}

export function createNativeWidgetSubscription<TInput, TEvent, TReturn>(
  path: readonly string[],
  select: (client: WidgetRpcClient) => NativeCall<TInput, AsyncIteratorObject<TEvent, TReturn, void>>,
) {
  return {
    path,
    useSubscription(
      input: TInput | typeof skipToken,
      options: { onData: (event: TEvent) => void; onError: (error: unknown) => void; enabled?: boolean },
    ) {
      const { client, cacheScope } = useWidgetTransport();
      const callbacks = useRef(options);
      callbacks.current = options;
      const inputKey = input === skipToken ? "disabled" : hashKey([input]);
      const stableInput = useMemo(() => input, [inputKey]);
      const enabled = options.enabled !== false;
      useEffect(() => {
        if (stableInput === skipToken || !enabled) return;
        const controller = new AbortController();
        const cancel = consumeAsyncIterator(select(client)(stableInput, { signal: controller.signal }), {
          onEvent: (event) => {
            if (!controller.signal.aborted) callbacks.current.onData(event);
          },
          onError: (error) => {
            if (!controller.signal.aborted) callbacks.current.onError(error);
          },
        });
        return () => {
          controller.abort();
          void cancel().catch(() => undefined);
        };
      }, [client, cacheScope, stableInput, enabled]);
    },
  };
}

export function useWidgetQueryUtilities() {
  const queryClient = useQueryClient();
  const transport = useWidgetTransport();
  return { queryClient, ...transport };
}
