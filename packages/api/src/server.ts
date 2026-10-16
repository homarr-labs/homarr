import { cache } from "react";
import { createTRPCClient, httpLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";

import type { AppRouter } from "./legacy";
import { createRscRequestHeadersAsync } from "./rsc-context";
import { getTrpcUrl, makeQueryClient } from "./shared";

// Server rendering uses the same authenticated HTTP boundary as other clients.
// Import AppRouter only as a type so the frontend does not load backend routers.
export const api = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: getTrpcUrl(),
      transformer: SuperJSON,
      headers: createRscRequestHeadersAsync,
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
    }),
  ],
});

export const getQueryClient = cache(makeQueryClient);
export const trpc = createTRPCOptionsProxy({
  client: api,
  queryClient: getQueryClient,
});

export const getBackendRuntimeAsync = cache(async () => await api.frontend.runtime.query());
