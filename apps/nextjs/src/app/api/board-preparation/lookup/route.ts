import { after, NextRequest, NextResponse } from "next/server";

import { getPreparationOrigin, isPreparationRequest } from "@homarr/cron-jobs/board-preparation";

export const GET = async (request: Request) => {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  if (!isPreparationRequest(request)) return new Response(null, { status: 404, headers });
  const search = new URL(request.url).searchParams;
  const pathname = search.get("pathname");
  const rewrite = search.get("rewrite");
  if (
    !pathname?.startsWith("/") ||
    pathname.startsWith("//") ||
    !rewrite?.startsWith("/") ||
    rewrite.startsWith("//")
  ) {
    return new Response(null, { status: 400, headers });
  }
  const documentHeaders = new Headers({ accept: "text/html" });
  for (const name of ["cookie", "user-agent", "sec-ch-viewport-width"]) {
    const value = request.headers.get(name);
    if (value !== null) documentHeaders.set(name, value);
  }
  const document = new NextRequest(new URL(pathname, getPreparationOrigin()), {
    method: request.method,
    headers: documentHeaders,
  });
  const fallback = NextResponse.rewrite(new URL(rewrite, getPreparationOrigin()));
  const { lookupPreparedBoardResponseAsync } = await import("~/board-preparation/lookup");
  const prepared = await lookupPreparedBoardResponseAsync(document, (work) => after(() => work), fallback);
  if (prepared) return prepared;
  return new Response(null, {
    status: 204,
    headers: { ...headers, "X-Homarr-Board-Cache": fallback.headers.get("X-Homarr-Board-Cache") ?? "MISS" },
  });
};
