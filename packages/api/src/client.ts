"use client";

import { createTRPCClient, createTRPCReact, httpLink } from "@trpc/react-query";
import SuperJSON from "superjson";

import type { AppRouter } from ".";
import { createHeadersCallbackForSource } from "./shared";

export const clientApi = createTRPCReact<AppRouter>();
export const fetchApi = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: getTrpcUrl(),
      transformer: SuperJSON,
      headers: createHeadersCallbackForSource("fetch"),
    }),
  ],
});

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Creates the full url for the trpc api endpoint
 * @returns
 */
export function getTrpcUrl() {
  return `${getBaseUrl()}/api/trpc`;
}
