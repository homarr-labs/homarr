"use client";

import type { PropsWithChildren } from "react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
import {
  createWSClient,
  httpLink,
  isNonJsonSerializable,
  loggerLink,
  splitLink,
  unstable_httpBatchStreamLink,
  wsLink,
} from "@trpc/client";
import superjson from "superjson";
import type { SuperJSONResult } from "superjson";

import type { AppRouter } from "@homarr/api";
import { clientApi, getTrpcUrl } from "@homarr/api/client";
import { createHeadersCallbackForSource } from "@homarr/api/shared";

import { env } from "~/env";

const getWebSocketProtocol = () => {
  // window is not defined on server side
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
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
          },
        },
      }),
  );

  const [trpcClient] = useState(() => {
    return clientApi.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" || (opts.direction === "down" && opts.result instanceof Error),
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
              /**
               * We don't want to transform the data here as we want to use form data
               */
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
            false: unstable_httpBatchStreamLink({
              transformer: superjson,
              url: getTrpcUrl(),
              maxURLLength: 2083, // Suggested by tRPC: https://trpc.io/docs/client/links/httpBatchLink#setting-a-maximum-url-length
              headers: createHeadersCallbackForSource("nextjs-react (json)"),
            }),
          }),
        }),
      ],
    });
  });

  return (
    <clientApi.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ReactQueryStreamedHydration transformer={superjson}>{props.children}</ReactQueryStreamedHydration>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </clientApi.Provider>
  );
}
