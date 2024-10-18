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

import type { AppRouter } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import { env } from "~/env.mjs";

const constructWebsocketUrl = () => {
  const fallback = "ws://localhost:3001/websockets";
  if (typeof window === "undefined") {
    return fallback;
  }

  if (env.NODE_ENV === "development") {
    return fallback;
  }

  return `ws://${window.location.hostname}:${window.location.port}/websockets`;
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
                deserialize(data: unknown) {
                  return data;
                },
              },
              url: `${getBaseUrl()}/api/trpc`,
            }),
            false: unstable_httpBatchStreamLink({
              transformer: superjson,
              url: `${getBaseUrl()}/api/trpc`,
              headers() {
                const headers = new Headers();
                headers.set("x-trpc-source", "nextjs-react");
                return headers;
              },
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

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
