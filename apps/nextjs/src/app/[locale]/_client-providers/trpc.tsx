"use client";

import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  createWSClient,
  httpBatchStreamLink,
  httpLink,
  httpSubscriptionLink,
  isNonJsonSerializable,
  loggerLink,
  splitLink,
  wsLink,
} from "@trpc/client";
import superjson from "superjson";
import type { SuperJSONResult } from "superjson";

import { TRPCClientError } from "@trpc/client";

import type { AppRouter } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import {
  dashboardSupportingQueryPolicies,
  isTrpcForbiddenError,
  isWidgetDataQueryKey,
  queryCacheDefaultGcTimeMs,
  queryCacheDefaultRefetchIntervalMs,
  queryCacheDefaultStaleTimeMs,
} from "@homarr/api/query-cache";
import { createHeadersCallbackForSource, getTrpcUrl } from "@homarr/api/shared";
import { useSession } from "@homarr/auth/client";
import { env } from "@homarr/common/env";
import { showWarningNotification } from "@homarr/notifications";
import { widgetQueryRefetchIntervals } from "@homarr/widgets/refetch-intervals";

import { getSessionQueryScope, SessionQueryScopeGuard } from "./session-query-scope";
import { createSessionQueryPersistence } from "./query-persistence";
import type { SessionQueryPersistence } from "./query-persistence";
import { createQueryRetry } from "./query-retry";

const DevelopmentTools =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./development-tools").then(({ DevelopmentTools: Tools }) => Tools), { ssr: false })
    : () => null;

const getWebSocketProtocol = () => {
  if (typeof window === "undefined") {
    return "ws";
  }

  return window.location.protocol === "https:" ? "wss" : "ws";
};

const constructWebsocketUrl = () => {
  const fallback = `${getWebSocketProtocol()}://localhost:3001/websockets`;
  if (typeof window === "undefined") {
    return fallback;
  }

  if (env.NODE_ENV === "development") {
    return fallback;
  }

  return `${getWebSocketProtocol()}://${window.location.hostname}:${window.location.port}/websockets`;
};

export function TRPCReactProvider({ children }: PropsWithChildren) {
  const { data: session } = useSession();
  const sessionQueryScope = getSessionQueryScope(session);
  const [initialSessionQueryScope] = useState(() => sessionQueryScope);
  const [queryPersistence] = useState(() => createSessionQueryPersistence(initialSessionQueryScope));
  const handleScopeChange = useCallback(() => {
    void queryPersistence.persister.removeClient();
    reloadPage();
  }, [queryPersistence]);

  return (
    <SessionQueryScopeGuard
      initialScope={initialSessionQueryScope}
      currentScope={sessionQueryScope}
      onScopeChange={handleScopeChange}
    >
      <ScopedTRPCReactProvider queryPersistence={queryPersistence}>{children}</ScopedTRPCReactProvider>
    </SessionQueryScopeGuard>
  );
}

const reloadPage = () => window.location.reload();

const ScopedTRPCReactProvider = ({
  children,
  queryPersistence,
}: PropsWithChildren<{ queryPersistence: SessionQueryPersistence }>) => {
  const wsClient = useMemo(
    () =>
      createWSClient({
        url: constructWebsocketUrl(),
        lazy: { enabled: true, closeMs: 30_000 },
      }),
    [],
  );
  useEffect(
    () => () => {
      void wsClient.close();
    },
    [wsClient],
  );
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      queryCache: new QueryCache({
        onError(error, query) {
          if (!isTrpcForbiddenError(error) || !isWidgetDataQueryKey(query.queryKey)) return;
          void queryPersistence.persister.removeClient();
          query.setState({ data: undefined, dataUpdatedAt: 0, isInvalidated: true });
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: queryCacheDefaultStaleTimeMs,
          gcTime: queryCacheDefaultGcTimeMs,
          retry: createQueryRetry(env.NODE_ENV === "development" ? 1 : 3),
        },
        mutations: {
          onError(error) {
            if (
              error instanceof TRPCClientError &&
              error.data?.code === "FORBIDDEN" &&
              error.message === "Mutations are disabled in demo mode"
            ) {
              showWarningNotification({
                title: "Demo mode",
                message: "This action is disabled in demo mode.",
              });
            }
          },
        },
      },
    });
    client.setQueryDefaults([["widget"]], {
      refetchInterval: queryCacheDefaultRefetchIntervalMs,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
    for (const { queryKey, intervalSeconds } of widgetQueryRefetchIntervals) {
      client.setQueryDefaults(queryKey, {
        refetchInterval: intervalSeconds === null ? false : intervalSeconds * 1000,
      });
    }
    for (const { queryKey, ...policy } of dashboardSupportingQueryPolicies) {
      client.setQueryDefaults(queryKey, policy);
    }
    return client;
  });

  useEffect(() => () => queryClient.clear(), [queryClient]);

  const trpcClient = useMemo(() => {
    return clientApi.createClient({
      links: [
        loggerLink({
          enabled: (opts) => opts.direction === "down" && opts.result instanceof Error,
        }),
        splitLink({
          condition: ({ type }) => type === "subscription",
          true: splitLink({
            condition: ({ path }) => path === "widget.beszel.subscribeSystemStats",
            true: httpSubscriptionLink({
              url: getTrpcUrl(),
              transformer: superjson,
              eventSourceOptions: { withCredentials: true },
            }),
            false: wsLink<AppRouter>({
              client: wsClient,
              transformer: superjson,
            }),
          }),
          false: splitLink({
            condition: ({ input }) => isNonJsonSerializable(input),
            true: httpLink({
              transformer: {
                serialize(object: unknown) {
                  return object;
                },
                deserialize(data: SuperJSONResult) {
                  return superjson.deserialize<unknown>(data);
                },
              },
              url: getTrpcUrl(),
              headers: createHeadersCallbackForSource("nextjs-react (form-data)"),
            }),
            false: httpBatchStreamLink({
              transformer: superjson,
              url: getTrpcUrl(),
              maxURLLength: 2083,
              headers: createHeadersCallbackForSource("nextjs-react (json)"),
            }),
          }),
        }),
      ],
    });
  }, [wsClient]);

  return (
    <clientApi.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider client={queryClient} persistOptions={queryPersistence}>
        <ReactQueryStreamedHydration transformer={superjson}>{children}</ReactQueryStreamedHydration>
        {process.env.NODE_ENV === "development" && <DevelopmentTools />}
      </PersistQueryClientProvider>
    </clientApi.Provider>
  );
};
