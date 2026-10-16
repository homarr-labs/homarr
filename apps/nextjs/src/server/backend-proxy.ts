// The dashboard forwards transport only. Authentication, validation and business
// logic execute in the independently deployable backend.
export async function forwardBackendRequestAsync(request: Request, _context?: unknown) {
  const incomingUrl = new URL(request.url);
  const backendUrl = new URL(process.env.HOMARR_BACKEND_URL ?? "http://127.0.0.1:3002");
  backendUrl.pathname = incomingUrl.pathname;
  backendUrl.search = incomingUrl.search;
  const headers = new Headers(request.headers);
  for (const name of [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "content-length",
  ])
    headers.delete(name);
  headers.set("accept-encoding", "identity");
  headers.set("x-forwarded-host", request.headers.get("x-forwarded-host") ?? incomingUrl.host);
  headers.set("x-forwarded-proto", request.headers.get("x-forwarded-proto") ?? incomingUrl.protocol.slice(0, -1));
  const options: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
    signal: request.signal,
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    options.body = request.body;
    options.duplex = "half";
  }
  const upstream = await fetch(backendUrl, options);
  const responseHeaders = new Headers(upstream.headers);
  // Fetch owns wire decoding and framing; the streamed response gets its own.
  responseHeaders.delete("content-length");
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("connection");
  responseHeaders.delete("set-cookie");
  for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append("set-cookie", cookie);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
