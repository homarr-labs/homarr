import { headers } from "next/headers";
import { cache } from "react";

import type { Session } from "./types";

// Next renders the session supplied by the backend. It does not load provider
// configuration, adapters, passwords or the session database.
export const auth = cache(async (): Promise<Session | null> => {
  const incoming = await headers();
  const requestHeaders = new Headers();
  for (const name of ["cookie", "user-agent", "host", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-for"]) {
    const value = incoming.get(name);
    if (value) requestHeaders.set(name, value);
  }
  const url = new URL("/api/auth/session", process.env.HOMARR_BACKEND_URL ?? "http://127.0.0.1:3002");
  const response = await fetch(url, { headers: requestHeaders, cache: "no-store", redirect: "error" });
  if (!response.ok) throw new Error("Failed to resolve the backend session");
  const session = (await response.json()) as Session | null;
  if (!session?.user) return null;
  return session;
});
