import type { MiddlewareHandler } from "hono";

import { extractBaseUrlFromHeaders } from "@homarr/common";

import { env } from "./env";

/** Apply headers to the final response, including raw Web Response handlers. */
export const backendCors: MiddlewareHandler = async (context, next) => {
  const setHeaders = () => {
    const origin = context.req.header("origin");
    const publicOrigin = extractBaseUrlFromHeaders(context.req.raw.headers);
    if (origin && (origin === publicOrigin || env.BACKEND_CORS_ORIGINS?.includes(origin))) {
      context.header("Access-Control-Allow-Origin", origin);
      context.header("Access-Control-Allow-Credentials", "true");
      context.header("Vary", "Origin", { append: true });
    } else {
      context.header("Access-Control-Allow-Origin", "*");
    }
    context.header("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
    context.header(
      "Access-Control-Allow-Headers",
      "Content-Type, ApiKey, Authorization, x-trpc-source, mcp-protocol-version, mcp-session-id, last-event-id",
    );
    context.header("Access-Control-Expose-Headers", "mcp-session-id, WWW-Authenticate");
  };
  if (context.req.method === "OPTIONS") {
    setHeaders();
    return context.body(null, 204);
  }
  await next();
  setHeaders();
};
