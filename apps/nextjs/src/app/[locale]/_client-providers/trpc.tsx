"use client";

import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { defaultShouldDehydrateQuery, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
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
import { DemoReadOnlyProvider } from "@homarr/widgets/demo-read-only";
import { widgetQueryRefetchIntervals } from "@homarr/widgets/refetch-intervals";

import { useAuthContext } from "./session";
import { getSessionQueryScope, SessionQueryScopeGuard } from "./session-query-scope";
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

export function TRPCReactProvider({ children, demoReadOnly }: PropsWithChildren<{ demoReadOnly: boolean }>) {
  const { data: session } = useSession();
  const { logoutRedirectInProgress } = useAuthContext();
  const sessionQueryScope = getSessionQueryScope(session);
  const [initialSessionQueryScope] = useState(() => sessionQueryScope);
  const handleScopeChange = useCallback(() => {
    if (!logoutRedirectInProgress.current) reloadPage();
  }, [logoutRedirectInProgress]);

  return (
    <SessionQueryScopeGuard
      initialScope={initialSessionQueryScope}
      currentScope={sessionQueryScope}
      onScopeChange={handleScopeChange}
    >
      <ScopedTRPCReactProvider demoReadOnly={demoReadOnly}>{children}</ScopedTRPCReactProvider>
    </SessionQueryScopeGuard>
  );
}

const reloadPage = () => window.location.reload();

const clearLegacyDashboardPersistence = () => {
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[storageName];
      for (let index = storage.length - 1; index >= 0; index--) {
        const key = storage.key(index);
        if (key?.startsWith("homarr:widget-query-cache:")) storage.removeItem(key);
      }
    } catch {
      // Storage can be unavailable in private or locked-down browsers.
    }
  }
};

const ScopedTRPCReactProvider = ({ children, demoReadOnly }: PropsWithChildren<{ demoReadOnly: boolean }>) => {
  useEffect(clearLegacyDashboardPersistence, []);
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
  const [{ queryClient, rscStreamedQueryHashes }] = useState(() => {
    const streamedHashes = new Set<string>();
    const client = new QueryClient({
      queryCache: new QueryCache({
        onError(error, query) {
          if (!isTrpcForbiddenError(error) || !isWidgetDataQueryKey(query.queryKey)) return;
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
      refetchInterval: demoReadOnly ? false : queryCacheDefaultRefetchIntervalMs,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
    for (const queryDefaults of widgetQueryRefetchIntervals) {
      const policy: { refetchInterval?: number | false; staleTime?: number } = {};
      if (demoReadOnly || queryDefaults.intervalSeconds === null) policy.refetchInterval = false;
      else if (typeof queryDefaults.intervalSeconds === "number") {
        policy.refetchInterval = queryDefaults.intervalSeconds * 1000;
      }
      if ("staleTimeSeconds" in queryDefaults) policy.staleTime = queryDefaults.staleTimeSeconds * 1000;
      client.setQueryDefaults(queryDefaults.queryKey, policy);
    }
    for (const { queryKey, ...policy } of dashboardSupportingQueryPolicies) {
      client.setQueryDefaults(
        queryKey,
        demoReadOnly
          ? { ...policy, refetchInterval: false, refetchOnWindowFocus: false, refetchOnReconnect: false }
          : policy,
      );
    }
    if (typeof window === "undefined") {
      client.getQueryCache().subscribe((event) => {
        if (event.query.meta?.rscWidgetPrefetch === true) streamedHashes.add(event.query.queryHash);
        if (event.type === "removed") streamedHashes.delete(event.query.queryHash);
      });
    }
    return { queryClient: client, rscStreamedQueryHashes: streamedHashes };
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
    <DemoReadOnlyProvider value={demoReadOnly}>
      <clientApi.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ReactQueryStreamedHydration
            transformer={superjson}
            options={{
              dehydrate: {
                // These promises already travel through the RSC boundary. Sending
                // them again here duplicates large album and chart payloads.
                shouldDehydrateQuery: (query) =>
                  !rscStreamedQueryHashes.has(query.queryHash) &&
                  query.meta?.rscWidgetPrefetch !== true &&
                  defaultShouldDehydrateQuery(query),
              },
            }}
          >
            {children}
          </ReactQueryStreamedHydration>
          {process.env.NODE_ENV === "development" && <DevelopmentTools />}
        </QueryClientProvider>
      </clientApi.Provider>
    </DemoReadOnlyProvider>
  );
};
