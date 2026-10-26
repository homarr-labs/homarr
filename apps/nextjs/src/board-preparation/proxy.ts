import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createPreparationHeaders, getPreparationOrigin } from "@homarr/cron-jobs/board-preparation";

const cacheHeader = "X-Homarr-Board-Cache";

// Keep database/auth/widget dependencies in the application server. Proxy has
// its own runtime; importing the lookup there retains a second dependency graph.
export const getPreparedBoardResponseAsync = async (request: NextRequest, localizedResponse: NextResponse) => {
  const rewrite = localizedResponse.headers.get("x-middleware-rewrite");
  if (!rewrite || localizedResponse.status !== 200) return null;
  const query = new URLSearchParams({ pathname: request.nextUrl.pathname, rewrite: new URL(rewrite).pathname });
  const path = `/api/board-preparation/lookup?${query}`;
  const headers = new Headers(createPreparationHeaders(request.method, path));
  headers.set("accept-encoding", "identity");
  for (const name of ["cookie", "user-agent", "sec-ch-viewport-width"]) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const controller = new AbortController();
  // The lookup has a 100 ms budget; allow a little time for loopback transport.
  // Clear the timer after headers so a slow browser can finish reading the HTML.
  const timer = setTimeout(() => controller.abort(), 125);
  try {
    const response = await fetch(getPreparationOrigin() + path, {
      method: request.method,
      headers,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    const cache = response.headers.get(cacheHeader) ?? "MISS; reason=lookup_unavailable";
    if (response.status !== 200 || !cache.startsWith("HIT;")) {
      await response.body?.cancel();
      localizedResponse.headers.set(cacheHeader, cache);
      return null;
    }
    const resultHeaders = new Headers();
    for (const [name, value] of localizedResponse.headers) {
      if (!name.startsWith("x-middleware-")) resultHeaders.append(name, value);
    }
    resultHeaders.set("Content-Type", "text/html; charset=utf-8");
    resultHeaders.set("Cache-Control", "private, no-store, max-age=0");
    resultHeaders.set(cacheHeader, cache);
    return new NextResponse(response.body, { status: 200, headers: resultHeaders });
  } catch {
    localizedResponse.headers.set(cacheHeader, "MISS; reason=lookup_unavailable");
    return null;
  } finally {
    clearTimeout(timer);
  }
};
