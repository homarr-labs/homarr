import { RPCLink } from "@orpc/client/fetch";

export function createWidgetRpcLink(endpoint: URL) {
  if (typeof window === "undefined") throw new Error("Widget RPC transport is browser-only");
  const origin = window.location.origin;
  const url = new URL(endpoint.href);
  if (url.origin !== origin) throw new Error("Widget RPC requires a same-origin endpoint");
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Widget RPC endpoints cannot contain credentials, query parameters or fragments");
  }
  if (url.pathname.startsWith("//")) throw new Error("Widget RPC requires an origin-relative pathname");
  const pathname: `/${string}` = `/${url.pathname.slice(1)}`;
  return new RPCLink({
    url: pathname,
    method: "POST",
    fetch: async (request, init) => {
      const target = new URL(request, origin);
      if (target.origin !== origin || window.location.origin !== origin) {
        throw new Error("Widget RPC requires a current same-origin endpoint");
      }
      const response = await fetch(target.href, { ...init, credentials: "same-origin", redirect: "error" });
      if (
        response.redirected ||
        response.type === "opaqueredirect" ||
        (response.status >= 300 && response.status < 400)
      ) {
        throw new Error("Widget RPC redirects are unavailable");
      }
      return response;
    },
  });
}
