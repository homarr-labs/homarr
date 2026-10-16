"use client";

import { createContext, useContext } from "react";
import { createTRPCClient, httpLink, splitLink } from "@trpc/client";
import type { TRPCClient } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import SuperJSON from "superjson";

import type { AppRouter } from "./legacy";
import { createHeadersCallbackForSource, getTrpcUrl } from "./shared";
import { createWorkerLink, hasWorkerTransport } from "./worker-link";

export const clientApi = createTRPCReact<AppRouter>();
export const fetchApi = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: hasWorkerTransport,
      true: createWorkerLink(),
      false: httpLink({
        url: getTrpcUrl(),
        transformer: SuperJSON,
        headers: createHeadersCallbackForSource("fetch"),
      }),
    }),
  ],
});

const FetchApiContext = createContext<TRPCClient<AppRouter> | null>(null);
export const FetchApiProvider = FetchApiContext.Provider;

/** Async callbacks retain the client belonging to the component's worker scope. */
export function useScopedFetchApi(): TRPCClient<AppRouter> {
  return useContext(FetchApiContext) ?? fetchApi;
}
