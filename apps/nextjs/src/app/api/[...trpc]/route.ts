import type { NextRequest } from "next/server";
import { userAgent } from "next/server";
import { createOpenApiFetchHandler } from "trpc-to-openapi";

import { createTRPCContext } from "@homarr/api";
import { openApiRouter } from "@homarr/api/open-api";
import { API_KEY_HEADER_NAME, getSessionFromApiKeyAsync } from "@homarr/auth/api-key";
import { ipAddressFromHeaders } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { db } from "@homarr/db";

const logger = createLogger({ module: "trpcOpenApiRoute" });

function withCors(response: Response) {
  // REST authenticates explicitly with ApiKey, never with ambient session cookies.
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", `Content-Type, ${API_KEY_HEADER_NAME}`);
  return response;
}

export function OPTIONS() {
  return withCors(new Response(null, { status: 204 }));
}

const handlerAsync = async (req: NextRequest) => {
  const apiKeyHeaderValue = req.headers.get(API_KEY_HEADER_NAME);
  const ipAddress = ipAddressFromHeaders(req.headers);
  const { ua } = userAgent(req);

  logger.info(
    `Creating OpenAPI fetch handler for user ${apiKeyHeaderValue ? "with an api key" : "without an api key"}`,
  );

  const session = await getSessionFromApiKeyAsync(db, apiKeyHeaderValue, ipAddress, ua);

  // Fallback to JSON if no content type is set
  if (!req.headers.has("Content-Type")) {
    req.headers.set("Content-Type", "application/json");
  }

  const response = await createOpenApiFetchHandler({
    req,
    endpoint: "/",
    router: openApiRouter,
    createContext: () => createTRPCContext({ session, headers: req.headers }),
    onError({ error, path, type }) {
      logger.error(new ErrorWithMetadata("tRPC Error occured", { path, type }, { cause: error }));
    },
  });
  return withCors(response);
};

export {
  handlerAsync as DELETE,
  handlerAsync as GET,
  handlerAsync as PATCH,
  handlerAsync as POST,
  handlerAsync as PUT,
};
