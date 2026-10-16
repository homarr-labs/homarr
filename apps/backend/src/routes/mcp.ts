import { Hono } from "hono";

import { handleMcpRequest } from "@homarr/api/http/mcp/_handler";
import { getMcpMetadata, getMcpMetadataOptions } from "@homarr/api/http/mcp/metadata";
import {
  getMcpConsentResponse,
  getMcpConsentErrorResponse,
  getMcpConsentStateResponse,
} from "@homarr/api/http/mcp/oauth/consent";
import { getMcpAuthorizationResponse, POST as decideAuthorization } from "@homarr/api/http/mcp/oauth/authorize/route";
import { POST as registerClient } from "@homarr/api/http/mcp/oauth/register/route";
import { POST as redeemToken } from "@homarr/api/http/mcp/oauth/token/route";

export const mcpRoutes = new Hono()
  .get("/api/mcp/oauth/authorize", (context) => getMcpAuthorizationResponse(context.req.raw, "/api/auth/signin"))
  .post("/api/mcp/oauth/authorize", (context) => decideAuthorization(context.req.raw))
  .post("/api/mcp/oauth/register", (context) => registerClient(context.req.raw))
  .post("/api/mcp/oauth/token", (context) => redeemToken(context.req.raw))
  .get("/api/mcp/oauth/consent", (context) => getMcpConsentStateResponse(context.req.raw))
  .get("/auth/mcp", (context) => getMcpConsentResponse(context.req.raw))
  .get("/auth/mcp/error", (context) => getMcpConsentErrorResponse(context.req.raw))
  .post("/api/mcp", (context) => handleMcpRequest(context.req.raw))
  .on(["GET", "POST", "DELETE"], "/api/mcp/:transport", (context) => handleMcpRequest(context.req.raw))
  .get("/.well-known/*", (context) =>
    getMcpMetadata(context.req.raw, context.req.path.slice("/.well-known/".length).split("/")),
  )
  .get("/well-known/*", (context) =>
    getMcpMetadata(context.req.raw, context.req.path.slice("/well-known/".length).split("/")),
  )
  .options("/.well-known/*", () => getMcpMetadataOptions())
  .options("/well-known/*", () => getMcpMetadataOptions())
  .get("/api/mcp/:transport/.well-known/*", (context) => {
    const path = context.req.path.split("/.well-known/")[1]?.split("/") ?? [];
    return getMcpMetadata(context.req.raw, [...path, "api", "mcp", context.req.param("transport")]);
  })
  .options("/api/mcp/:transport/.well-known/*", () => getMcpMetadataOptions());
