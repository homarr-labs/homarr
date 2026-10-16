import { cache } from "react";
import { headers } from "next/headers";

// Resolve identity in the backend, preserving only request metadata that its
// auth and device detection need. Transport headers belong to the HTTP client.
export const createRscRequestHeadersAsync = cache(async () => {
  const incoming = await headers();
  const requestHeaders = new Headers();
  for (const name of [
    "cookie",
    "authorization",
    "user-agent",
    "host",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-forwarded-for",
    "x-real-ip",
    "accept-language",
  ]) {
    const value = incoming.get(name);
    if (value) requestHeaders.set(name, value);
  }
  requestHeaders.set("x-trpc-source", "rsc");
  return requestHeaders;
});
