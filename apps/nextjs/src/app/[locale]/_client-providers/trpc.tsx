"use client";

import type { PropsWithChildren } from "react";
import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  createWSClient,
  httpBatchStreamLink,
  httpLink,
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
  isPersistableWidgetQueryKey,
  queryCacheBuster,
  queryCacheDefaultGcTimeMs,
  queryCacheDefaultRefetchIntervalMs,
  queryCacheDefaultStaleTimeMs,
} from "@homarr/api/query-cache";
import { createHeadersCallbackForSource, getTrpcUrl } from "@homarr/api/shared";
import { env } from "@homarr/common/env";
import { showWarningNotification } from "@homarr/notifications";

import { createWidgetQueryPersister } from "./query-cache-persister";

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

const wsClient = createWSClient({
  url: constructWebsocketUrl(),
});

export function TRPCReactProvider(props: PropsWithChildren) {
  const [persister] = useState(() => createWidgetQueryPersister());
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: queryCacheDefaultStaleTimeMs,
          gcTime: queryCacheDefaultGcTimeMs,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          retry: 3,
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
    client.setQueryDefaults([["widget"]], { refetchInterval: queryCacheDefaultRefetchIntervalMs });
    return client;
  });

  const [trpcClient] = useState(() => {
    return clientApi.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            env.NODE_ENV === "development" || (opts.direction === "down" && opts.result instanceof Error),
        }),
        splitLink({
          condition: ({ type }) => type === "subscription",
          true: wsLink<AppRouter>({
            client: wsClient,
            transformer: superjson,
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
  });

  return (
    <clientApi.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          buster: queryCacheBuster,
          maxAge: queryCacheDefaultGcTimeMs,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              query.state.status === "success" && isPersistableWidgetQueryKey(query.queryKey),
          },
        }}
      >
        <ReactQueryStreamedHydration transformer={superjson}>{props.children}</ReactQueryStreamedHydration>
        <ReactQueryDevtools initialIsOpen={false} />
      </PersistQueryClientProvider>
    </clientApi.Provider>
  );
}
