import { NextRequest } from "next/server";

import { createHandlers } from "@homarr/auth";
import type { SupportedAuthProvider } from "@homarr/definitions";
import { logger } from "@homarr/log";

export const GET = async (req: NextRequest) => {
  return await createHandlers(extractProvider(req)).handlers.GET(reqWithTrustedOrigin(req));
};
export const POST = async (req: NextRequest) => {
  return await createHandlers(extractProvider(req)).handlers.POST(reqWithTrustedOrigin(req));
};

/**
 * This method extracts the used provider from the url and allows us to override the getUserByEmail method in the adapter.
 * @param req request containing the url
 * @returns the provider or "unknown" if the provider could not be extracted
 */
const extractProvider = (req: NextRequest): SupportedAuthProvider | "unknown" => {
  const url = new URL(req.url);

  if (url.pathname.includes("oidc")) {
    return "oidc";
  }

  if (url.pathname.includes("credentials")) {
    return "credentials";
  }

  if (url.pathname.includes("ldap")) {
    return "ldap";
  }

  return "unknown";
};

/**
 * This is a workaround to allow the authentication to work with behind a proxy.
 * See https://github.com/nextauthjs/next-auth/issues/10928#issuecomment-2162893683
 */
const reqWithTrustedOrigin = (req: NextRequest): NextRequest => {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host");
  if (!proto || !host) {
    logger.warn("Missing x-forwarded-proto or x-forwarded-host headers.");
    return req;
  }

  const envOrigin = `${proto}://${host}`;
  const { href, origin } = req.nextUrl;
  logger.debug(`Rewriting origin from ${origin} to ${envOrigin}`);
  return new NextRequest(href.replace(origin, envOrigin), req);
};
