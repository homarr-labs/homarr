import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";

import { createOpenApiHandler, normalizeRecursiveJsonSchemasForScalar, openApiDocument } from "@homarr/api/open-api";
import { orpcRouter } from "@homarr/api/orpc";
import { extractBaseUrlFromHeaders } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import { createBackendContextAsync, isRpcOriginAllowed } from "../context";

const logger = createLogger({ module: "backendRpc" });
const rpcHandler = new RPCHandler(orpcRouter, {
  // POST keeps mutations out of browser GET requests, including cross-site ones.
  allowMethods: ["POST"],
  interceptors: [
    onError((error, { path }) => {
      logger.error(new ErrorWithMetadata("oRPC request failed", { path: path.join(".") }, { cause: error }));
    }),
  ],
});
const restHandler = createOpenApiHandler((error, path) => {
  logger.error(new ErrorWithMetadata("REST request failed", { path: path.join(".") }, { cause: error }));
});

export const rpcRoutes = new Hono()
  .all("/rpc/*", async (context) => {
    const request = context.req.raw;
    const auth = await createBackendContextAsync(request);
    if (!isRpcOriginAllowed(request, auth.authenticatedWithApiKey)) {
      return context.json({ message: "This origin is not allowed to make authenticated RPC requests." }, 403);
    }
    const result = await rpcHandler.handle(request, { prefix: "/rpc", context: auth.context });
    if (!result.matched) return context.notFound();
    return context.newResponse(result.response.body, result.response);
  })
  .get("/api/openapi", async (context) => {
    const document = await openApiDocument(extractBaseUrlFromHeaders(context.req.raw.headers));
    if (context.req.query("format") === "scalar") {
      return context.json(normalizeRecursiveJsonSchemasForScalar(document));
    }
    return context.json(document);
  })
  // Mount after the explicitly migrated routes so their existing URLs win.
  .all("/api/*", async (context) => {
    const headers = new Headers(context.req.raw.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    const request = new Request(context.req.raw, { headers });
    // Keep REST authentication explicit. Ambient session cookies never grant REST access.
    const auth = await createBackendContextAsync(request, { apiKeyOnly: true });
    const result = await restHandler.handle(request, { context: auth.context });
    if (!result.matched) return context.notFound();
    return context.newResponse(result.response.body, result.response);
  });

export function registerRpcRoutes(app: Hono) {
  app.route("/", rpcRoutes);
}
