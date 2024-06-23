import { NextRequest } from "next/server";

import { createHandlers } from "@homarr/auth";
import { logger } from "@homarr/log";

export const GET = async (req: NextRequest) => {
  return await createHandlers(isCredentialsRequest(req)).handlers.GET(reqWithTrustedOrigin(req));
};
export const POST = async (req: NextRequest) => {
  return await createHandlers(isCredentialsRequest(req)).handlers.POST(reqWithTrustedOrigin(req));
};

const isCredentialsRequest = (req: NextRequest) => {
  return req.url.includes("credentials") && req.method === "POST";
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
