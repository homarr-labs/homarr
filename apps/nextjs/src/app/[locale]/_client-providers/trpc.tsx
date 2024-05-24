"use client";

import type { PropsWithChildren } from "react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
import { createWSClient, loggerLink, unstable_httpBatchStreamLink, wsLink } from "@trpc/client";
import superjson from "superjson";

import type { AppRouter } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

const wsClient = createWSClient({
  url: "ws://localhost:3001",
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
        (args) => {
          return ({ op, next }) => {
            console.log("op", op.type, op.input, op.path, op.id);
            if (op.type === "subscription") {
              const link = wsLink<AppRouter>({
                client: wsClient,
                transformer: superjson,
              });
              return link(args)({ op, next });
            }

            return unstable_httpBatchStreamLink({
              transformer: superjson,
              url: `${getBaseUrl()}/api/trpc`,
              headers() {
                const headers = new Headers();
                headers.set("x-trpc-source", "nextjs-react");
                return headers;
              },
            })(args)({ op, next });
          };
        },
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
