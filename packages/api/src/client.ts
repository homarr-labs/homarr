import { createTRPCClient, createTRPCReact, httpLink } from "@trpc/react-query";
import SuperJSON from "superjson";

import type { AppRouter } from ".";

export const clientApi = createTRPCReact<AppRouter>();
export const fetchApi = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: SuperJSON,
      headers() {
        const headers = new Headers();
        headers.set("x-trpc-source", "fetch");
        return headers;
      },
    }),
  ],
});

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
