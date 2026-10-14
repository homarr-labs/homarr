import { RPCLink } from "@orpc/client/fetch";

export function resolveBrowserRpcEndpoint(endpoint: string | URL): URL {
  if (typeof window === "undefined") throw new Error("RPC transport is browser-only");
  const url = new URL(endpoint, window.location.origin);
  if (url.origin !== window.location.origin || url.username || url.password) {
    throw new Error("RPC transport requires a same-origin endpoint without credentials");
  }
  if (url.search || url.hash) throw new Error("RPC endpoints must not contain a query or fragment");
  return url;
}

export function createBrowserRpcLink(endpoint: string | URL) {
  const url = resolveBrowserRpcEndpoint(endpoint);
  return new RPCLink({
    url: `/${url.pathname.slice(1)}`,
    method: "POST",
    fetch: (request, init) => {
      const resolvedRequest = new URL(request, url.origin);
      if (window.location.origin !== url.origin || resolvedRequest.origin !== url.origin) {
        throw new Error("RPC transport origin changed");
      }
      return fetch(resolvedRequest.href, { ...init, credentials: "same-origin", redirect: "error" });
    },
  });
}
