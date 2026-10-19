"use client";

import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { defaultShouldDehydrateQuery, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
import { ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import superjson from "superjson";

import { clientApi } from "@homarr/api/client";
import {
  dashboardSupportingQueryPolicies,
  isRpcForbiddenError,
  isWidgetDataQueryKey,
  queryCacheDefaultGcTimeMs,
  queryCacheDefaultRefetchIntervalMs,
  queryCacheDefaultStaleTimeMs,
} from "@homarr/api/query-cache";
import { createHeadersCallbackForSource, getRpcUrl } from "@homarr/api/shared";
import { useSession } from "@homarr/auth/client";
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

export function RPCReactProvider({ children, demoReadOnly }: PropsWithChildren<{ demoReadOnly: boolean }>) {
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
      <ScopedRPCReactProvider demoReadOnly={demoReadOnly}>{children}</ScopedRPCReactProvider>
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

const ScopedRPCReactProvider = ({ children, demoReadOnly }: PropsWithChildren<{ demoReadOnly: boolean }>) => {
  useEffect(clearLegacyDashboardPersistence, []);
  const [{ queryClient, rscStreamedQueryHashes }] = useState(() => {
    const streamedHashes = new Set<string>();
    const client = new QueryClient({
      queryCache: new QueryCache({
        onError(error, query) {
          if (!isRpcForbiddenError(error) || !isWidgetDataQueryKey(query.queryKey)) return;
          query.setState({ data: undefined, dataUpdatedAt: 0, isInvalidated: true });
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: queryCacheDefaultStaleTimeMs,
          gcTime: queryCacheDefaultGcTimeMs,
          retry: createQueryRetry(process.env.NODE_ENV === "development" ? 1 : 3),
        },
        mutations: {
          onError(error) {
            if (
              error instanceof ORPCError &&
              error.code === "FORBIDDEN" &&
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

  const trpcClient = useMemo(
    () =>
      clientApi.createClient({
        link: new RPCLink({
          url: "/rpc",
          origin: new URL(getRpcUrl()).origin,
          headers: createHeadersCallbackForSource("nextjs-react"),
          fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
        }),
      }),
    [],
  );

  return (
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
          <DemoReadOnlyProvider value={demoReadOnly}>{children}</DemoReadOnlyProvider>
        </ReactQueryStreamedHydration>
        {process.env.NODE_ENV === "development" && <DevelopmentTools />}
      </QueryClientProvider>
    </clientApi.Provider>
  );
};
