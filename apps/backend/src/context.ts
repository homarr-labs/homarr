import { createApiContext } from "@homarr/api";
import { API_KEY_HEADER_NAME, getSessionFromApiKeyAsync } from "@homarr/auth/api-key";
import { getSessionFromRequestAsync } from "@homarr/auth/http";
import { extractBaseUrlFromHeaders } from "@homarr/common";
import { ipAddressFromHeaders, userAgent } from "@homarr/common/server";
import { db } from "@homarr/db";

export async function createBackendContextAsync(request: Request, options: { apiKeyOnly?: boolean } = {}) {
  const apiKeySession = await getSessionFromApiKeyAsync(
    db,
    request.headers.get(API_KEY_HEADER_NAME),
    ipAddressFromHeaders(request.headers),
    userAgent(request.headers).ua,
  );
  let session = apiKeySession;
  if (!session && !options.apiKeyOnly) {
    session = await getSessionFromRequestAsync(request);
  }
  return {
    context: createApiContext({ headers: request.headers, session }),
    authenticatedWithApiKey: apiKeySession !== null,
  };
}

export function isRpcOriginAllowed(request: Request, authenticatedWithApiKey: boolean) {
  if (authenticatedWithApiKey || request.method === "GET" || request.method === "HEAD") return true;

  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";

  const allowedOrigins = new Set(
    (process.env.BACKEND_CORS_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  allowedOrigins.add(new URL(request.url).origin);
  allowedOrigins.add(extractBaseUrlFromHeaders(request.headers));
  return allowedOrigins.has(origin);
}
