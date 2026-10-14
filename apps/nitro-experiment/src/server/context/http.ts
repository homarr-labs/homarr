import { ORPCError } from "@orpc/server";

import { assertLocalRequest } from "../access/guards";
import { createRequestContext } from "./request";
import type { RequestContext } from "./request";

export const errorStatusMap = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
};

export async function runFixtureRequest(
  request: Request,
  handler: (context: RequestContext) => Promise<Response>,
): Promise<Response> {
  try {
    const context = await createRequestContext(request);
    assertLocalRequest(context);
    const response = await handler(context);
    response.headers.set("Cache-Control", "no-store");
    for (const [name, value] of context.responseHeaders) {
      if (name !== "set-cookie") response.headers.set(name, value);
    }
    for (const cookie of context.responseHeaders.getSetCookie()) response.headers.append("Set-Cookie", cookie);
    return response;
  } catch (error) {
    const code = error instanceof ORPCError ? error.code : "INTERNAL_SERVER_ERROR";
    const status = Object.hasOwn(errorStatusMap, code) ? errorStatusMap[code as keyof typeof errorStatusMap] : 500;
    return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
