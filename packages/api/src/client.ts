import { createTRPCClient, createTRPCReact, httpLink } from "@trpc/react-query";
import SuperJSON from "superjson";

import type { AppRouter } from ".";

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

/**
 * Creates a headers callback for a given source
 * It will set the x-trpc-source header and cookies if needed
 * @param source trpc source request comes from
 * @returns headers callback
 */
export function createHeadersCallbackForSource(source: string) {
  return async () => {
    const headers = new Headers();
    headers.set("x-trpc-source", source);

    const cookies = await importCookiesAsync();
    // We need to set cookie for ssr requests (for example with useSuspenseQuery or middleware)
    if (cookies) {
      headers.set("cookie", cookies);
    }

    return headers;
  };
}

/**
 * This is a workarround as cookies are not passed to the server
 * when using useSuspenseQuery or middleware
 * @returns cookie string on server or null on client
 */
async function importCookiesAsync() {
  if (typeof window === "undefined") {
    return await /* @next-codemod-error The APIs under 'next/headers' are async now, need to be manually awaited. */
    import("next/headers").then(({ cookies }) =>
      cookies()
        .getAll()
        .map(({ name, value }) => `${name}=${value}`)
        .join(";"),
    );
  }

  return null;
}
