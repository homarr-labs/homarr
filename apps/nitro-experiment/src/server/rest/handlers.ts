import { OpenAPIHandler } from "@orpc/openapi/fetch";

import { renderApiDocs } from "../../features/api-docs/document";
import { restPrefix } from "../../features/api-docs/reference";
import { assertLocalRequest } from "../access/guards";
import type { RequestContext } from "../context/request";
import { getOpenApiDocumentJson } from "./document";
import { restErrorStatusMap, restRouter, sanitizeRestError } from "./router";

const restHandler = new OpenAPIHandler(restRouter, {
  errorStatusMap: restErrorStatusMap,
  customErrorResponseBodyEncoder: (error) => sanitizeRestError(error.code),
});

function rejectDocumentationMethod(request: Request): Response | null {
  if (request.method === "GET" || request.method === "HEAD") return null;
  return Response.json(
    { code: "METHOD_NOT_ALLOWED" },
    { status: 405, headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" } },
  );
}

export async function handleRest(context: RequestContext): Promise<Response> {
  assertLocalRequest(context);
  const result = await restHandler.handle(context.request, { prefix: restPrefix, context });
  const response = result.matched ? result.response : Response.json(sanitizeRestError("NOT_FOUND"), { status: 404 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function handleOpenApi(context: RequestContext): Promise<Response> {
  assertLocalRequest(context);
  const rejected = rejectDocumentationMethod(context.request);
  if (rejected) return rejected;
  const json = await getOpenApiDocumentJson();
  return new Response(context.request.method === "HEAD" ? null : json, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function handleApiDocs(context: RequestContext): Promise<Response> {
  assertLocalRequest(context);
  const rejected = rejectDocumentationMethod(context.request);
  if (rejected) return rejected;
  return new Response(context.request.method === "HEAD" ? null : renderApiDocs(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
